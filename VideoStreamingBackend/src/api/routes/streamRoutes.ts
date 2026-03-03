/**
 * REST routes for stream management (WebRTC architecture).
 *
 * These routes handle:
 * - Starting/stopping camera ingest (RTSP → mediasoup)
 * - Querying stream status and real-time stats
 * - ICE server configuration for clients
 *
 * WebRTC signaling itself happens over WebSocket (signalingHandler.ts).
 */
import { Router, Request, Response, NextFunction } from 'express';
import { StartStreamUseCase } from '../../application/use-cases/StartStream';
import { StopStreamUseCase } from '../../application/use-cases/StopStream';
import { GetStreamStatusUseCase } from '../../application/use-cases/GetStreamStatus';
import { ListActiveStreamsUseCase } from '../../application/use-cases/ListActiveStreams';
import { StreamManager } from '../../infrastructure/streaming/StreamManager';
import { ICameraService } from '../../domain/services';
import {
  toSessionDTO,
  StartStreamRequestDTO,
  StopStreamRequestDTO,
} from '../../application/dtos';
import { authMiddleware } from '../middleware/auth';
import { IAuthService } from '../../domain/services';
import { logger } from '../../infrastructure/logging/logger';

export function createStreamRoutes(
  authService: IAuthService,
  cameraService: ICameraService,
  streamManager: StreamManager,
): Router {
  const router = Router();
  const auth = authMiddleware(authService);

  router.use(auth);

  const startUC = new StartStreamUseCase(streamManager, cameraService);
  const stopUC = new StopStreamUseCase(streamManager);
  const statusUC = new GetStreamStatusUseCase(streamManager);
  const listUC = new ListActiveStreamsUseCase(streamManager);

  /**
   * POST /api/v1/streams/start
   * Start camera ingest (RTSP → mediasoup Router).
   */
  router.post('/start', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body as StartStreamRequestDTO;
      if (!body.camera_id) {
        res.status(400).json({ detail: { message: 'camera_id is required', error_code: 'VALIDATION_ERROR' } });
        return;
      }

      const session = await startUC.execute({
        cameraId: body.camera_id,
        userId: req.user!.sub,
        token: req.token!,
        streamUrl: body.stream_url,
        config: body.config,
      });

      res.status(201).json(toSessionDTO(session));
    } catch (err) {
      next(err);
    }
  });

  /**
   * POST /api/v1/streams/stop
   */
  router.post('/stop', (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body as StopStreamRequestDTO;
      if (!body.camera_id) {
        res.status(400).json({ detail: { message: 'camera_id is required', error_code: 'VALIDATION_ERROR' } });
        return;
      }
      const session = stopUC.execute({ cameraId: body.camera_id });
      res.json(toSessionDTO(session));
    } catch (err) {
      next(err);
    }
  });

  /**
   * GET /api/v1/streams/status/:cameraId
   */
  router.get('/status/:cameraId', (req: Request, res: Response) => {
    const result = statusUC.execute(req.params.cameraId);
    res.json({
      camera_id: result.cameraId,
      is_streaming: result.isStreaming,
      status: result.status,
      session: result.session ? toSessionDTO(result.session) : null,
      signaling_url: result.signalingUrl,
    });
  });

  /**
   * GET /api/v1/streams/active
   */
  router.get('/active', (_req: Request, res: Response) => {
    const result = listUC.execute();
    res.json({
      count: result.count,
      streams: result.streams.map(toSessionDTO),
    });
  });

  /**
   * GET /api/v1/streams/realtime/:cameraId
   * Returns real-time info: actual FPS, viewer count, audio status, bitrate.
   */
  router.get('/realtime/:cameraId', async (req: Request, res: Response) => {
    const cameraId = req.params.cameraId;
    const info = await streamManager.getRealTimeInfo(cameraId);

    if (!info) {
      res.json({
        camera_id: cameraId,
        is_streaming: false,
        current_fps: 0,
        viewer_count: 0,
        has_audio: false,
        status: 'stopped',
        uptime: 0,
        bitrate: 0,
      });
      return;
    }

    res.json({
      camera_id: cameraId,
      is_streaming: true,
      current_fps: info.currentFps,
      viewer_count: info.viewerCount,
      has_audio: info.hasAudio,
      status: info.status,
      uptime: info.uptime,
      bitrate: info.bitrate,
    });
  });

  /**
   * GET /api/v1/streams/frame/:cameraId
   * Returns the latest JPEG frame for a camera (HTTP polling fallback).
   * Auto-starts the stream if not already running.
   */
  router.get('/frame/:cameraId', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const cameraId = req.params.cameraId;

      // Auto-start stream if not running
      if (!streamManager.isStreaming(cameraId)) {
        try {
          await startUC.execute({ cameraId, userId: req.user!.sub, token: req.token! });
        } catch {
          // May already be starting or camera not found – ignore and try to return frame anyway
        }
      }

      const frame = streamManager.getLatestFrame(cameraId);
      if (frame && frame.length > 0) {
        res.set('Content-Type', 'image/jpeg');
        res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
        res.send(frame);
        return;
      }

      // Return 1×1 black JPEG placeholder
      const BLACK_JPEG = Buffer.from(
        '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEB' +
        'AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEB' +
        'AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIA' +
        'AhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEA' +
        'AAAAAAAAAAAAAAAAAAAB/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AJgAB/9k=',
        'base64',
      );
      res.set('Content-Type', 'image/jpeg');
      res.set('Cache-Control', 'no-cache');
      res.send(BLACK_JPEG);
    } catch (err) {
      next(err);
    }
  });

  /**
   * GET /api/v1/streams/ice-servers
   * Returns ICE server configuration for WebRTC clients.
   */
  router.get('/ice-servers', (_req: Request, res: Response) => {
    res.json({
      ice_servers: streamManager.getIceServers(),
    });
  });

  /**
   * POST /api/v1/streams/probe
   * Probe a stream URL (kept for compatibility).
   */
  router.post('/probe', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { stream_url } = req.body;
      if (!stream_url) {
        res.status(400).json({ detail: { message: 'stream_url is required', error_code: 'VALIDATION_ERROR' } });
        return;
      }
      // Use FFmpeg probe (kept from original)
      const { probeStream } = await import('../../infrastructure/streaming/FFmpegProcess');
      const result = await probeStream(stream_url);
      res.json({ stream_url, ...result });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
