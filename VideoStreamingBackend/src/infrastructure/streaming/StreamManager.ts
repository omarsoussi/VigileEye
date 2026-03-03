/**
 * StreamManager — Orchestrates camera ingest and viewer lifecycle.
 *
 * Supports DUAL mode:
 *   1. JPEG over WebSocket (legacy frontend) — FFmpegProcess → binary frames
 *   2. WebRTC via SFU (new path)             — MediasoupSFU → mediasoup consumers
 *
 * Both pipelines run simultaneously per camera so old and new clients coexist.
 *
 * Architecture:
 *   StreamManager uses ISFUService (port) → MediasoupSFU (adapter)
 *   StreamManager uses FFmpegProcess for legacy JPEG extraction
 *   StreamManager uses IStreamSessionRepository for persistence
 *   Application layer use cases call StreamManager methods
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { StreamSession, StreamStatus, DEFAULT_STREAM_CONFIG, StreamConfig } from '../../domain/entities/StreamSession';
import { IStreamSessionRepository } from '../../domain/repositories';
import {
  ISFUService,
  RtpCapabilities,
  WebRtcTransportParams,
  DtlsParameters,
  ConsumerParams,
} from '../../domain/services';
import { AudioExtractor, FFmpegProcess, probeStream } from './FFmpegProcess';
import { config } from '../config';
import { logger } from '../logging/logger';

export class StreamManager extends EventEmitter {
  private sessions = new Map<string, StreamSession>();

  /** FFmpeg JPEG extraction processes (legacy JPEG WS path) */
  private jpegProcesses = new Map<string, FFmpegProcess>();
  /** Latest JPEG frame per camera (for HTTP polling fallback) */
  private latestFrames = new Map<string, Buffer>();

  /** FFmpeg audio extraction per camera (raw PCM over WS) */
  private audioExtractors = new Map<string, AudioExtractor>();
  private audioViewerCounts = new Map<string, number>();
  private audioInfo = new Map<string, { sampleRate: number; channels: number; hasAudio: boolean }>();
  private audioStopTimers = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly repo: IStreamSessionRepository,
    private readonly sfu: ISFUService | null,
  ) {
    super();
  }

  private async getOrProbeAudioInfo(cameraId: string): Promise<{ sampleRate: number; channels: number; hasAudio: boolean }> {
    const existing = this.audioInfo.get(cameraId);
    if (existing) return existing;

    const session = this.sessions.get(cameraId);
    if (!session) {
      const fallback = { hasAudio: false, sampleRate: 48000, channels: 1 };
      this.audioInfo.set(cameraId, fallback);
      return fallback;
    }

    try {
      const probe = await probeStream(session.streamUrl);
      const info = {
        hasAudio: probe.hasAudio,
        sampleRate: probe.audioSampleRate ?? 48000,
        channels: probe.audioChannels ?? 1,
      };
      this.audioInfo.set(cameraId, info);
      return info;
    } catch {
      const fallback = { hasAudio: false, sampleRate: 48000, channels: 1 };
      this.audioInfo.set(cameraId, fallback);
      return fallback;
    }
  }

  /**
   * Start audio extraction if needed and increment audio viewer count.
   * Returns negotiated audio metadata for the frontend.
   */
  async addAudioViewer(cameraId: string): Promise<{ sampleRate: number; channels: number; hasAudio: boolean }> {
    const current = this.audioViewerCounts.get(cameraId) ?? 0;
    this.audioViewerCounts.set(cameraId, current + 1);

    const timer = this.audioStopTimers.get(cameraId);
    if (timer) {
      clearTimeout(timer);
      this.audioStopTimers.delete(cameraId);
    }

    const info = await this.getOrProbeAudioInfo(cameraId);
    this.ensureAudioExtraction(cameraId, info);
    return info;
  }

  removeAudioViewer(cameraId: string): void {
    const current = this.audioViewerCounts.get(cameraId) ?? 0;
    const next = Math.max(0, current - 1);
    this.audioViewerCounts.set(cameraId, next);

    if (next > 0) return;
    if (this.audioStopTimers.has(cameraId)) return;

    const timeout = setTimeout(() => {
      this.stopAudioExtraction(cameraId);
    }, 5000);
    timeout.unref();
    this.audioStopTimers.set(cameraId, timeout);
  }

  // ═══════════════════════════════════════════════════════════════
  // Camera Ingest (RTSP → SFU)
  // ═══════════════════════════════════════════════════════════════

  /**
   * Start streaming for a camera.
   * Launches JPEG extraction (always) and SFU ingest (if available).
   */
  async startStream(
    cameraId: string,
    ownerUserId: string,
    streamUrl: string,
    partialConfig?: Partial<StreamConfig>,
  ): Promise<StreamSession> {
    // Return existing if already active
    const existing = this.sessions.get(cameraId);
    if (existing && (existing.status === 'active' || existing.status === 'connecting')) {
      return existing;
    }

    const streamConfig: StreamConfig = {
      ...DEFAULT_STREAM_CONFIG,
      fps: partialConfig?.fps ?? config.defaultFps,
      width: partialConfig?.width ?? config.defaultWidth,
      height: partialConfig?.height ?? config.defaultHeight,
      codec: partialConfig?.codec ?? DEFAULT_STREAM_CONFIG.codec,
      bitrate: partialConfig?.bitrate ?? DEFAULT_STREAM_CONFIG.bitrate,
    };

    const session: StreamSession = {
      id: uuidv4(),
      cameraId,
      ownerUserId,
      streamUrl,
      status: 'connecting',
      config: streamConfig,
      viewerCount: 0,
      routerId: null,
      videoProducerId: null,
      audioProducerId: null,
      startedAt: null,
      lastFrameAt: null,
      stoppedAt: null,
      errorMessage: null,
      reconnectAttempts: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.sessions.set(cameraId, session);
    this.repo.save(session);

    // ── Always start JPEG extraction for legacy WS viewers ──
    this.startJpegExtraction(cameraId, streamUrl, streamConfig);

    // ── Start audio extraction lazily (only if an audio viewer connects) ──
    // Audio extraction is triggered via addAudioViewer() so we don't waste CPU.

    // ── Try SFU ingest (if mediasoup is available) ──
    if (this.sfu) {
      try {
        const result = await this.sfu.ingestCamera(cameraId, streamUrl, {
          fps: streamConfig.fps,
          width: streamConfig.width,
          height: streamConfig.height,
        });

        session.routerId = result.routerId;
        session.videoProducerId = result.videoProducerId;
        session.audioProducerId = result.audioProducerId;
      } catch (err: any) {
        logger.warn(`[StreamManager] SFU ingest failed for ${cameraId} (JPEG still active): ${err.message}`);
      }
    }

    session.status = 'active';
    session.startedAt = new Date();
    session.updatedAt = new Date();
    this.repo.save(session);

    logger.info(`[StreamManager] Stream active for camera ${cameraId}`);
    return session;
  }

  private ensureAudioExtraction(cameraId: string, info: { sampleRate: number; channels: number; hasAudio: boolean }): void {
    if (this.audioExtractors.has(cameraId)) return;
    const session = this.sessions.get(cameraId);
    if (!session) return;
    if (!info.hasAudio) return;

    // If no audio viewers, don't start.
    const viewers = this.audioViewerCounts.get(cameraId) ?? 0;
    if (viewers <= 0) return;

    const extractor = new AudioExtractor();
    extractor.on('audio', (chunk: Buffer) => {
      this.emit('audio', cameraId, chunk);
    });
    extractor.on('close', (code: number) => {
      logger.info(`[StreamManager] Audio FFmpeg exited for ${cameraId} (code ${code})`);
      this.audioExtractors.delete(cameraId);
    });
    extractor.on('error', (err: Error) => {
      logger.warn(`[StreamManager] Audio FFmpeg error for ${cameraId}: ${err.message}`);
      this.audioExtractors.delete(cameraId);
    });

    this.audioExtractors.set(cameraId, extractor);
    extractor.start(session.streamUrl, info.sampleRate, info.channels);
    logger.info(`[StreamManager] Audio extraction started for ${cameraId}`);
  }

  private stopAudioExtraction(cameraId: string): void {
    const proc = this.audioExtractors.get(cameraId);
    if (proc) {
      proc.stop();
      this.audioExtractors.delete(cameraId);
    }
  }

  // ─── JPEG Frame Extraction (legacy WS + HTTP polling) ────────

  private startJpegExtraction(cameraId: string, streamUrl: string, streamConfig: StreamConfig): void {
    if (this.jpegProcesses.has(cameraId)) return;

    const ffmpeg = new FFmpegProcess();

    ffmpeg.on('frame', (frame: Buffer) => {
      this.latestFrames.set(cameraId, frame);
      // Update lastFrameAt
      const session = this.sessions.get(cameraId);
      if (session) {
        session.lastFrameAt = new Date();
      }
      // Fan out to WS viewers listening on the 'frame' event
      this.emit('frame', cameraId, frame);
    });

    ffmpeg.on('close', (code: number) => {
      logger.info(`[StreamManager] JPEG FFmpeg exited for ${cameraId} (code ${code})`);
      this.jpegProcesses.delete(cameraId);

      // Auto-reconnect if session is still meant to be active
      const session = this.sessions.get(cameraId);
      if (session && session.status === 'active' && session.reconnectAttempts < config.maxReconnectAttempts) {
        session.status = 'reconnecting';
        session.reconnectAttempts++;
        session.updatedAt = new Date();
        logger.info(`[StreamManager] Reconnecting JPEG for ${cameraId} (attempt ${session.reconnectAttempts})`);
        setTimeout(() => {
          if (this.sessions.has(cameraId)) {
            this.startJpegExtraction(cameraId, streamUrl, streamConfig);
            const s = this.sessions.get(cameraId);
            if (s) { s.status = 'active'; s.updatedAt = new Date(); }
          }
        }, config.reconnectDelayMs);
      }
    });

    ffmpeg.on('error', (err: Error) => {
      logger.error(`[StreamManager] JPEG FFmpeg error for ${cameraId}: ${err.message}`);
    });

    ffmpeg.start({
      streamUrl,
      fps: streamConfig.fps,
      width: streamConfig.width,
      height: streamConfig.height,
    });

    this.jpegProcesses.set(cameraId, ffmpeg);
    logger.info(`[StreamManager] JPEG extraction started for ${cameraId}`);
  }

  /** Get latest JPEG frame for HTTP polling */
  getLatestFrame(cameraId: string): Buffer | null {
    return this.latestFrames.get(cameraId) ?? null;
  }

  /**
   * Stop streaming for a camera (both JPEG and SFU).
   */
  stopStream(cameraId: string): StreamSession | null {
    const session = this.sessions.get(cameraId);
    if (!session) return null;

    // Stop JPEG extraction
    const ffmpeg = this.jpegProcesses.get(cameraId);
    if (ffmpeg) {
      ffmpeg.stop();
      this.jpegProcesses.delete(cameraId);
    }
    this.latestFrames.delete(cameraId);

    // Stop audio extraction
    this.stopAudioExtraction(cameraId);
    this.audioInfo.delete(cameraId);

    // Stop SFU ingest
    if (this.sfu) {
      this.sfu.stopIngest(cameraId);
    }

    session.status = 'stopped';
    session.stoppedAt = new Date();
    session.updatedAt = new Date();
    this.repo.save(session);
    this.sessions.delete(cameraId);

    logger.info(`[StreamManager] Stopped stream for camera ${cameraId}`);
    return session;
  }

  stopAll(): void {
    for (const cameraId of Array.from(this.sessions.keys())) {
      this.stopStream(cameraId);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // WebRTC Viewer Negotiation (Signaling support)
  // ═══════════════════════════════════════════════════════════════

  /** Get Router RTP capabilities for a camera (needed by browser Device) */
  getRouterRtpCapabilities(cameraId: string): RtpCapabilities | null {
    return this.sfu?.getRouterRtpCapabilities(cameraId) ?? null;
  }

  /** Create a WebRtcTransport for a viewer */
  async createViewerTransport(cameraId: string): Promise<WebRtcTransportParams> {
    if (!this.sfu) throw new Error('SFU not available');
    return this.sfu.createViewerTransport(cameraId);
  }

  /** Connect a viewer's transport (ICE + DTLS) */
  async connectViewerTransport(cameraId: string, transportId: string, dtlsParameters: DtlsParameters): Promise<void> {
    if (!this.sfu) throw new Error('SFU not available');
    return this.sfu.connectViewerTransport(cameraId, transportId, dtlsParameters);
  }

  /** Create a Consumer for a viewer */
  async createConsumer(
    cameraId: string,
    transportId: string,
    producerId: string,
    rtpCapabilities: RtpCapabilities,
  ): Promise<ConsumerParams> {
    if (!this.sfu) throw new Error('SFU not available');
    return this.sfu.createConsumer(cameraId, transportId, producerId, rtpCapabilities);
  }

  /** Resume a Consumer */
  async resumeConsumer(cameraId: string, consumerId: string): Promise<void> {
    if (!this.sfu) throw new Error('SFU not available');
    return this.sfu.resumeConsumer(cameraId, consumerId);
  }

  /** Close a viewer's transport */
  closeViewerTransport(cameraId: string, transportId: string): void {
    this.sfu?.closeViewerTransport(cameraId, transportId);
  }

  // ═══════════════════════════════════════════════════════════════
  // Session Queries
  // ═══════════════════════════════════════════════════════════════

  getSession(cameraId: string): StreamSession | undefined {
    return this.sessions.get(cameraId);
  }

  getAllSessions(): StreamSession[] {
    return Array.from(this.sessions.values());
  }

  isStreaming(cameraId: string): boolean {
    const s = this.sessions.get(cameraId);
    return !!s && (s.status === 'active' || s.status === 'connecting');
  }

  /**
   * Get real-time info for a streaming camera.
   * Tries SFU stats first, falls back to JPEG pipeline info.
   */
  async getRealTimeInfo(cameraId: string): Promise<{
    currentFps: number;
    viewerCount: number;
    hasAudio: boolean;
    status: StreamStatus;
    uptime: number;
    bitrate: number;
  } | null> {
    const session = this.sessions.get(cameraId);
    if (!session) return null;

    let currentFps = 0;
    let hasAudio = false;
    let bitrate = 0;

    // Try SFU stats
    if (this.sfu) {
      try {
        const stats = await this.sfu.getStats(cameraId);
        if (stats) {
          currentFps = stats.currentFps ?? 0;
          hasAudio = stats.hasAudio ?? false;
          bitrate = stats.bitrate ?? 0;
        }
      } catch { /* SFU stats not available */ }
    }

    // Estimate FPS from JPEG frames if SFU stats unavailable
    if (currentFps === 0 && session.config) {
      currentFps = this.jpegProcesses.has(cameraId) ? session.config.fps : 0;
    }

    return {
      currentFps,
      viewerCount: session.viewerCount,
      hasAudio,
      status: session.status,
      uptime: session.startedAt
        ? Math.floor((Date.now() - session.startedAt.getTime()) / 1000)
        : 0,
      bitrate,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // Viewer counting
  // ═══════════════════════════════════════════════════════════════

  addViewer(cameraId: string): void {
    const s = this.sessions.get(cameraId);
    if (s) {
      s.viewerCount++;
      s.updatedAt = new Date();
    }
  }

  removeViewer(cameraId: string): void {
    const s = this.sessions.get(cameraId);
    if (s && s.viewerCount > 0) {
      s.viewerCount--;
      s.updatedAt = new Date();
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // ICE server config for clients
  // ═══════════════════════════════════════════════════════════════

  getIceServers(): Array<{ urls: string; username?: string; credential?: string }> {
    const servers: Array<{ urls: string; username?: string; credential?: string }> = [];

    if (config.stunServer) {
      servers.push({ urls: config.stunServer });
    }

    if (config.turnServer && config.turnUsername && config.turnCredential) {
      servers.push({
        urls: config.turnServer,
        username: config.turnUsername,
        credential: config.turnCredential,
      });
    }

    return servers;
  }
}
