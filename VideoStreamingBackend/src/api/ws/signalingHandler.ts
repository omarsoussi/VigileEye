/**
 * WebSocket signaling handler for WebRTC negotiation.
 *
 * Protocol (JSON messages over WebSocket):
 *
 *   Client → Server:
 *     { type: "create-transport" }
 *     { type: "connect-transport", transportId, dtlsParameters }
 *     { type: "consume", transportId, producerId, rtpCapabilities }
 *     { type: "consumer-resume", consumerId }
 *     { type: "ping" }
 *
 *   Server → Client:
 *     { type: "router-rtp-capabilities", rtpCapabilities, videoProducerId, audioProducerId }
 *     { type: "transport-created", transportId, iceParameters, iceCandidates, dtlsParameters, iceServers }
 *     { type: "transport-connected" }
 *     { type: "consumer-created", consumerId, producerId, kind, rtpParameters }
 *     { type: "consumer-resumed" }
 *     { type: "stats", ... }
 *     { type: "error", message }
 *     { type: "pong", timestamp }
 *
 * Flow: connect WS → receive router caps → create-transport → connect-transport → consume (video) → consume (audio) → resume
 */

import WebSocket from 'ws';
import http from 'http';
import { URL } from 'url';
import { IAuthService } from '../../domain/services';
import { ICameraService } from '../../domain/services';
import { StreamManager } from '../../infrastructure/streaming/StreamManager';
import { NegotiateViewerUseCase } from '../../application/use-cases/NegotiateViewer';
import { StartStreamUseCase } from '../../application/use-cases/StartStream';
import { logger } from '../../infrastructure/logging/logger';

export function createSignalingHandler(
  server: http.Server,
  authService: IAuthService,
  cameraService: ICameraService,
  streamManager: StreamManager,
): void {
  const wss = new WebSocket.Server({ noServer: true });
  const negotiateUC = new NegotiateViewerUseCase(streamManager, cameraService);

  // ── Handle HTTP Upgrade ──
  server.on('upgrade', (request, socket, head) => {
    const baseUrl = `http://${request.headers.host}`;
    let pathname: string;
    let searchParams: URLSearchParams;

    try {
      const url = new URL(request.url || '', baseUrl);
      pathname = url.pathname;
      searchParams = url.searchParams;
    } catch {
      socket.destroy();
      return;
    }

    // Match /ws/signaling/:cameraId
    const match = pathname.match(/^\/ws\/signaling\/([^/]+)$/);
    if (!match) {
      // Not our route — let other upgrade handlers (streamHandler) deal with it
      return;
    }

    const cameraId = match[1];
    const token = searchParams.get('token');

    if (!token) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    // Validate JWT
    let payload;
    try {
      payload = authService.validateToken(token);
    } catch {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket as any, head, (ws) => {
      wss.emit('connection', ws, request, {
        cameraId,
        userId: payload.sub,
        token,
      });
    });
  });

  // ── Handle Connections ──
  wss.on('connection', (ws: WebSocket, _req: http.IncomingMessage, ctx: { cameraId: string; userId: string; token: string }) => {
    const { cameraId, userId, token } = ctx;
    let viewerTransportId: string | null = null;

    logger.info(`[Signaling] Viewer ${userId} connected for camera ${cameraId}`);
    streamManager.addViewer(cameraId);

    // ── Step 1: Send Router RTP Capabilities ──
    (async () => {
      try {
        const caps = await negotiateUC.ensureStreamAndGetCapabilities({
          cameraId,
          userId,
          token,
        });

        sendJson(ws, {
          type: 'router-rtp-capabilities',
          rtpCapabilities: caps.rtpCapabilities,
          videoProducerId: caps.videoProducerId,
          audioProducerId: caps.audioProducerId,
        });
      } catch (err: any) {
        logger.error(`[Signaling] Failed to get caps for ${cameraId}: ${err.message}`);
        sendJson(ws, { type: 'error', message: err.message });
        ws.close();
      }
    })();

    // ── Periodic stats ──
    const statsInterval = setInterval(async () => {
      if (ws.readyState !== WebSocket.OPEN) return;
      const info = await streamManager.getRealTimeInfo(cameraId);
      if (info) {
        sendJson(ws, {
          type: 'stats',
          camera_id: cameraId,
          streaming: true,
          fps: info.currentFps,
          viewer_count: info.viewerCount,
          has_audio: info.hasAudio,
          status: info.status,
          uptime: info.uptime,
          bitrate: info.bitrate,
        });
      }
    }, 3000);

    // ── Message handler ──
    ws.on('message', async (raw: WebSocket.Data) => {
      let msg: any;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        sendJson(ws, { type: 'error', message: 'Invalid JSON' });
        return;
      }

      try {
        switch (msg.type) {
          // ── Create Transport ──
          case 'create-transport': {
            const params = await negotiateUC.createTransport(cameraId);
            viewerTransportId = params.id;
            sendJson(ws, {
              type: 'transport-created',
              transportId: params.id,
              iceParameters: params.iceParameters,
              iceCandidates: params.iceCandidates,
              dtlsParameters: params.dtlsParameters,
              iceServers: streamManager.getIceServers(),
            });
            break;
          }

          // ── Connect Transport (DTLS) ──
          case 'connect-transport': {
            await negotiateUC.connectTransport(
              cameraId,
              msg.transportId,
              msg.dtlsParameters,
            );
            sendJson(ws, { type: 'transport-connected' });
            break;
          }

          // ── Consume (subscribe to Producer) ──
          case 'consume': {
            const consumer = await negotiateUC.consume(
              cameraId,
              msg.transportId,
              msg.producerId,
              msg.rtpCapabilities,
            );
            sendJson(ws, {
              type: 'consumer-created',
              consumerId: consumer.id,
              producerId: consumer.producerId,
              kind: consumer.kind,
              rtpParameters: consumer.rtpParameters,
            });
            break;
          }

          // ── Resume Consumer ──
          case 'consumer-resume': {
            await negotiateUC.resumeConsumer(cameraId, msg.consumerId);
            sendJson(ws, { type: 'consumer-resumed', consumerId: msg.consumerId });
            break;
          }

          // ── Ping/Pong ──
          case 'ping': {
            sendJson(ws, { type: 'pong', timestamp: Date.now() });
            break;
          }

          default:
            sendJson(ws, { type: 'error', message: `Unknown message type: ${msg.type}` });
        }
      } catch (err: any) {
        logger.error(`[Signaling] Error handling ${msg.type} for ${cameraId}: ${err.message}`);
        sendJson(ws, { type: 'error', message: err.message });
      }
    });

    // ── Cleanup ──
    ws.on('close', () => {
      logger.info(`[Signaling] Viewer ${userId} disconnected from ${cameraId}`);
      clearInterval(statsInterval);
      if (viewerTransportId) {
        negotiateUC.disconnect(cameraId, viewerTransportId);
      } else {
        streamManager.removeViewer(cameraId);
      }
    });

    ws.on('error', (err) => {
      logger.error(`[Signaling] WS error for ${cameraId}: ${err.message}`);
      clearInterval(statsInterval);
      if (viewerTransportId) {
        negotiateUC.disconnect(cameraId, viewerTransportId);
      } else {
        streamManager.removeViewer(cameraId);
      }
    });
  });

  logger.info('[Signaling] WebRTC signaling handler initialized');
}

function sendJson(ws: WebSocket, data: any): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}
