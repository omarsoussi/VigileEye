/**
 * WebSocket handler for real-time JPEG frame streaming (legacy path).
 *
 * The frontend connects to /ws/stream/:cameraId?token=<JWT> and receives:
 *   - Binary: raw JPEG frames
 *   - JSON: { type: 'status', fps, viewer_count, has_audio, status, uptime }
 *
 * This coexists with the new WebRTC signaling handler (/ws/signaling/:cameraId).
 */
import WebSocket from 'ws';
import http from 'http';
import { URL } from 'url';
import { IAuthService } from '../../domain/services';
import { ICameraService } from '../../domain/services';
import { StreamManager } from '../../infrastructure/streaming/StreamManager';
import { StartStreamUseCase } from '../../application/use-cases/StartStream';
import { logger } from '../../infrastructure/logging/logger';

export function createWebSocketHandler(
  server: http.Server,
  authService: IAuthService,
  cameraService: ICameraService,
  streamManager: StreamManager,
): void {
  const wss = new WebSocket.Server({ noServer: true });
  const startUC = new StartStreamUseCase(streamManager, cameraService);

  // Handle upgrade requests for /ws/stream/ and /ws/frames/
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

    // Match /ws/stream/:cameraId or /ws/frames/:cameraId
    const streamMatch = pathname.match(/^\/ws\/(stream|frames)\/([^/]+)$/);
    if (!streamMatch) {
      // Not our route — let other upgrade handlers (signalingHandler) deal with it
      return;
    }

    const cameraId = streamMatch[2];
    const token = searchParams.get('token');

    if (!token) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    let payload;
    try {
      payload = authService.validateToken(token);
    } catch {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket as any, head, (ws) => {
      wss.emit('connection', ws, request, { cameraId, userId: payload.sub, token });
    });
  });

  wss.on('connection', (ws: WebSocket, _req: http.IncomingMessage, ctx: { cameraId: string; userId: string; token: string }) => {
    const { cameraId, userId, token } = ctx;
    handleVideoConnection(ws, cameraId, userId, token, streamManager, startUC);
  });

  logger.info('[WS] Legacy JPEG stream handler initialized (/ws/stream/:cameraId)');
}

function handleVideoConnection(
  ws: WebSocket,
  cameraId: string,
  userId: string,
  token: string,
  streamManager: StreamManager,
  startUC: StartStreamUseCase,
) {
  logger.info(`[WS] Video viewer connected for camera ${cameraId} (user ${userId})`);
  streamManager.addViewer(cameraId);

  // Auto-start stream if not running
  if (!streamManager.isStreaming(cameraId)) {
    startUC
      .execute({ cameraId, userId, token })
      .catch((err) => {
        logger.error(`[WS] Failed to auto-start stream for ${cameraId}: ${err.message}`);
        ws.send(JSON.stringify({ type: 'error', message: err.message }));
        ws.close();
      });
  }

  // Frame listener — binary JPEG frames
  const onFrame = (frameCameraId: string, frame: Buffer) => {
    if (frameCameraId !== cameraId) return;
    if (ws.readyState === WebSocket.OPEN) {
      // If the client/network is slow, don't queue old frames (latency killer).
      // Drop frames when the outbound buffer is backed up.
      if (ws.bufferedAmount > 1024 * 1024) return;
      ws.send(frame, { binary: true });
    }
  };

  streamManager.on('frame', onFrame);

  // Periodically send real-time status info (JSON)
  const statusInterval = setInterval(async () => {
    if (ws.readyState !== WebSocket.OPEN) return;
    try {
      const info = await streamManager.getRealTimeInfo(cameraId);
      if (info) {
        ws.send(JSON.stringify({
          type: 'status',
          camera_id: cameraId,
          streaming: true,
          fps: info.currentFps,
          viewer_count: info.viewerCount,
          has_audio: info.hasAudio,
          status: info.status,
          uptime: info.uptime,
        }));
      }
    } catch { /* ignore if getRealTimeInfo throws */ }
  }, 2000);

  // Handle client messages (ping/pong)
  ws.on('message', (data: WebSocket.Data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
      }
    } catch {
      // Binary or non-JSON — ignore
    }
  });

  ws.on('close', () => {
    logger.info(`[WS] Video viewer disconnected for camera ${cameraId}`);
    clearInterval(statusInterval);
    streamManager.removeListener('frame', onFrame);
    streamManager.removeViewer(cameraId);
  });

  ws.on('error', (err) => {
    logger.error(`[WS] Error for camera ${cameraId}: ${err.message}`);
    clearInterval(statusInterval);
    streamManager.removeListener('frame', onFrame);
    streamManager.removeViewer(cameraId);
  });

  // Send initial status (async IIFE)
  (async () => {
    try {
      const info = await streamManager.getRealTimeInfo(cameraId);
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'status',
          camera_id: cameraId,
          streaming: streamManager.isStreaming(cameraId),
          fps: info?.currentFps ?? 0,
          viewer_count: info?.viewerCount ?? 0,
          has_audio: info?.hasAudio ?? false,
          status: info?.status ?? 'connecting',
        }));
      }
    } catch { /* ignore */ }
  })();
}
