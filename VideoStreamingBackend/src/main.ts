/**
 * Video Streaming Service – Entry Point
 *
 * Supports TWO streaming modes simultaneously:
 *   1. Legacy JPEG streaming: WS /ws/stream/:cameraId  + HTTP /api/v1/streams/frame/:cameraId
 *   2. WebRTC (mediasoup SFU): WS /ws/signaling/:cameraId
 *
 * The legacy path always works (FFmpeg MJPEG extraction).
 * The WebRTC path is best-effort — if mediasoup fails to initialise the
 * service still starts and serves JPEG frames to the existing frontend.
 */

import http from 'http';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

import { config } from './infrastructure/config';
import { logger } from './infrastructure/logging/logger';
import { JwtAuthService } from './infrastructure/security/JwtAuthService';
import { HttpCameraService } from './infrastructure/external/HttpCameraService';
import { InMemoryStreamSessionRepository } from './infrastructure/persistence/InMemoryStreamSessionRepository';
import { InMemoryViewerSessionRepository } from './infrastructure/persistence/InMemoryViewerSessionRepository';
import { MediasoupSFU } from './infrastructure/streaming/MediasoupSFU';
import { StreamManager } from './infrastructure/streaming/StreamManager';
import { createStreamRoutes } from './api/routes/streamRoutes';
import { createSignalingHandler } from './api/ws/signalingHandler';
import { createWebSocketHandler } from './api/ws/streamHandler';
import { createAudioWebSocketHandler } from './api/ws/audioHandler';
import { errorHandler } from './api/middleware/errorHandler';
import { ISFUService } from './domain/services';

async function main(): Promise<void> {
  // ─── Bootstrap services ───
  const authService = new JwtAuthService();
  const cameraService = new HttpCameraService();
  const sessionRepo = new InMemoryStreamSessionRepository();
  const viewerRepo = new InMemoryViewerSessionRepository();

  // Initialise mediasoup SFU (optional – JPEG streaming works without it)
  let sfu: ISFUService | null = null;
  try {
    const mediasoupSFU = new MediasoupSFU();
    await mediasoupSFU.init();
    sfu = mediasoupSFU;
    logger.info('mediasoup SFU initialised — WebRTC path available');
  } catch (err: any) {
    logger.warn(`mediasoup SFU init failed (${err.message}) — running in JPEG-only mode`);
  }

  const streamManager = new StreamManager(sessionRepo, sfu);

  // ─── Express app ───
  const app = express();

  app.use(cors({
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));

  app.use(express.json());

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use(limiter);

  // ─── Health check ───
  app.get('/health', (_req, res) => {
    res.json({
      status: 'healthy',
      service: 'video-streaming-webrtc',
      uptime: process.uptime(),
      activeStreams: streamManager.getAllSessions().length,
    });
  });

  // ─── API routes ───
  app.use('/api/v1/streams', createStreamRoutes(authService, cameraService, streamManager));

  // ─── Error handler ───
  app.use(errorHandler);

  // ─── HTTP + WebSocket server ───
  const server = http.createServer(app);

  // Register BOTH WebSocket handlers:
  // 1. Legacy JPEG streaming: /ws/stream/:cameraId  &  /ws/frames/:cameraId
  createWebSocketHandler(server, authService, cameraService, streamManager);
  // 1b. Raw PCM audio streaming: /ws/audio/:cameraId
  createAudioWebSocketHandler(server, authService, cameraService, streamManager);
  // 2. WebRTC signaling:      /ws/signaling/:cameraId
  createSignalingHandler(server, authService, cameraService, streamManager);

  // ─── Graceful shutdown ───
  async function shutdown(signal: string) {
    logger.info(`Received ${signal}. Shutting down gracefully...`);
    streamManager.stopAll();
    if (sfu && typeof (sfu as any).shutdown === 'function') {
      await (sfu as any).shutdown();
    }
    server.close(() => {
      logger.info('Server closed.');
      process.exit(0);
    });
    // Force exit after 10s
    setTimeout(() => {
      logger.warn('Forced exit after timeout');
      process.exit(1);
    }, 10000);
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // ─── Start ───
  server.listen(config.port, '0.0.0.0', () => {
    logger.info(`🎬 Video Streaming Service running on port ${config.port}`);
    logger.info(`   Mode: ${sfu ? 'WebRTC + JPEG' : 'JPEG-only'}`);
    logger.info(`   Environment: ${config.nodeEnv}`);
    logger.info(`   Camera service: ${config.cameraServiceUrl}`);
    logger.info(`   Auth service: ${config.authServiceUrl}`);
    logger.info(`   FFmpeg: ${config.ffmpegPath}`);
    if (sfu) {
      logger.info(`   mediasoup workers: ${config.mediasoupNumWorkers}`);
      logger.info(`   RTP port range: ${config.rtcMinPort}-${config.rtcMaxPort}`);
    }
  });
}

main().catch((err) => {
  logger.error('Failed to start Video Streaming Service', err);
  process.exit(1);
});
