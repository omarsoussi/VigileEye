/**
 * WebSocket handler for raw PCM audio streaming.
 *
 * Frontend connects to: /ws/audio/:cameraId?token=<JWT>
 * Server sends:
 *   - JSON: { type: 'audio_metadata', sampleRate, channels }
 *   - Binary: Float32 PCM little-endian frames (20ms chunks)
 */

import WebSocket from 'ws';
import http from 'http';
import { URL } from 'url';
import { IAuthService, ICameraService } from '../../domain/services';
import { StreamManager } from '../../infrastructure/streaming/StreamManager';
import { StartStreamUseCase } from '../../application/use-cases/StartStream';
import { logger } from '../../infrastructure/logging/logger';

export function createAudioWebSocketHandler(
  server: http.Server,
  authService: IAuthService,
  cameraService: ICameraService,
  streamManager: StreamManager,
): void {
  const wss = new WebSocket.Server({ noServer: true });
  const startUC = new StartStreamUseCase(streamManager, cameraService);

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

    const match = pathname.match(/^\/ws\/audio\/([^/]+)$/);
    if (!match) {
      return;
    }

    const cameraId = match[1];
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

  wss.on(
    'connection',
    (ws: WebSocket, _req: http.IncomingMessage, ctx: { cameraId: string; userId: string; token: string }) => {
      const { cameraId, userId, token } = ctx;
      handleAudioConnection(ws, cameraId, userId, token, streamManager, startUC);
    },
  );

  logger.info('[WS] Audio stream handler initialized (/ws/audio/:cameraId)');
}

function handleAudioConnection(
  ws: WebSocket,
  cameraId: string,
  userId: string,
  token: string,
  streamManager: StreamManager,
  startUC: StartStreamUseCase,
) {
  logger.info(`[WS] Audio viewer connected for camera ${cameraId} (user ${userId})`);

  // Auto-start stream if not running
  const startPromise = !streamManager.isStreaming(cameraId)
    ? startUC.execute({ cameraId, userId, token })
    : Promise.resolve();

  // Start extractor (if audio exists) and send metadata
  (async () => {
    await startPromise;
    const audioInfo = await streamManager.addAudioViewer(cameraId);
    if (!audioInfo.hasAudio) {
      ws.send(JSON.stringify({ type: 'error', message: 'No audio available for this camera' }));
      ws.close();
      return;
    }
    ws.send(JSON.stringify({ type: 'audio_metadata', sampleRate: audioInfo.sampleRate, channels: audioInfo.channels }));
  })().catch((err) => {
    logger.warn(`[WS] Audio start/probe failed for ${cameraId}: ${err?.message || String(err)}`);
    try {
      ws.send(JSON.stringify({ type: 'error', message: 'Audio unavailable' }));
    } catch {
      // ignore
    }
    try {
      ws.close();
    } catch {
      // ignore
    }
  });

  const onAudio = (audioCameraId: string, chunk: Buffer) => {
    if (audioCameraId !== cameraId) return;
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(chunk, { binary: true });
    }
  };

  streamManager.on('audio', onAudio);

  ws.on('close', () => {
    logger.info(`[WS] Audio viewer disconnected for camera ${cameraId}`);
    streamManager.removeListener('audio', onAudio);
    streamManager.removeAudioViewer(cameraId);
  });

  ws.on('error', (err) => {
    logger.error(`[WS] Audio error for camera ${cameraId}: ${err.message}`);
    streamManager.removeListener('audio', onAudio);
    streamManager.removeAudioViewer(cameraId);
  });
}
