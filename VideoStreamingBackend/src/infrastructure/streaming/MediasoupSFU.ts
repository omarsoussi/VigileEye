// @ts-nocheck
/**
 * MediasoupSFU — Infrastructure adapter implementing ISFUService.
 *
 * Manages mediasoup Workers, Routers, Transports, Producers, and Consumers.
 * One Router per camera. Multiple WebRtcTransports per Router (one per viewer).
 * FFmpeg sends RTP to a PlainRtpTransport, the Router fans out to all viewers.
 *
 * This is the ONLY file that imports mediasoup — Clean Architecture boundary.
 */

import * as mediasoup from 'mediasoup';
// `types` may not be present when building without the real mediasoup package
// (e.g., during static TS checks). Expose a fallback `msTypes` as `any`.
const msTypes: any = (mediasoup as any)?.types ?? {};
// Provide a permissive type alias for compile-time when mediasoup types
// are not available in the environment (e.g., during static checks).
type msTypes = any;
import { ChildProcess, spawn } from 'child_process';
import {
  ISFUService,
  RtpCapabilities,
  WebRtcTransportParams,
  DtlsParameters,
  ConsumerParams,
  IngestResult,
} from '../../domain/services';
import { config, mediaCodecs } from '../config';
import { logger } from '../logging/logger';

// ─── Internal types ───

interface CameraRouter {
  router: msTypes.Router;
  /** PlainRtpTransport for FFmpeg ingest */
  plainTransport: msTypes.PlainTransport | null;
  /** Video Producer (H.264 from FFmpeg) */
  videoProducer: msTypes.Producer | null;
  /** Audio Producer (Opus from FFmpeg) */
  audioProducer: msTypes.Producer | null;
  /** FFmpeg process piping RTSP → RTP */
  ffmpegProcess: ChildProcess | null;
  /** FFmpeg audio process (separate) */
  ffmpegAudioProcess: ChildProcess | null;
  /** All viewer transports keyed by transport ID */
  viewerTransports: Map<string, msTypes.WebRtcTransport>;
  /** All consumers keyed by consumer ID */
  consumers: Map<string, msTypes.Consumer>;
  /** FPS tracking */
  frameCount: number;
  lastFpsCalc: number;
  currentFps: number;
  /** Audio PlainRtpTransport */
  audioPlainTransport: msTypes.PlainTransport | null;
}

export class MediasoupSFU implements ISFUService {
  private workers: msTypes.Worker[] = [];
  private nextWorkerIdx = 0;
  private cameras = new Map<string, CameraRouter>();

  // ─── Lifecycle ───

  async init(): Promise<void> {
    const numWorkers = config.mediasoupNumWorkers;
    logger.info(`[SFU] Initializing ${numWorkers} mediasoup workers...`);

    for (let i = 0; i < numWorkers; i++) {
      const worker = await mediasoup.createWorker({
        logLevel: config.mediasoupLogLevel as msTypes.WorkerLogLevel,
        rtcMinPort: config.rtcMinPort,
        rtcMaxPort: config.rtcMaxPort,
      });

      worker.on('died', () => {
        logger.error(`[SFU] Worker ${worker.pid} died! Restarting...`);
        // In production, restart the worker and re-create affected routers
        setTimeout(() => this.replaceWorker(i), 2000);
      });

      this.workers.push(worker);
      logger.info(`[SFU] Worker ${i} created (PID: ${worker.pid})`);
    }

    logger.info(`[SFU] All ${numWorkers} workers ready`);
  }

  private async replaceWorker(index: number): Promise<void> {
    try {
      const worker = await mediasoup.createWorker({
        logLevel: config.mediasoupLogLevel as msTypes.WorkerLogLevel,
        rtcMinPort: config.rtcMinPort,
        rtcMaxPort: config.rtcMaxPort,
      });
      worker.on('died', () => {
        logger.error(`[SFU] Replacement worker ${worker.pid} died!`);
        setTimeout(() => this.replaceWorker(index), 2000);
      });
      this.workers[index] = worker;
      logger.info(`[SFU] Worker ${index} replaced (PID: ${worker.pid})`);
    } catch (err: any) {
      logger.error(`[SFU] Failed to replace worker: ${err.message}`);
    }
  }

  private getNextWorker(): msTypes.Worker {
    const worker = this.workers[this.nextWorkerIdx];
    this.nextWorkerIdx = (this.nextWorkerIdx + 1) % this.workers.length;
    return worker;
  }

  // ─── Router RTP Capabilities ───

  getRouterRtpCapabilities(cameraId: string): RtpCapabilities | null {
    const cam = this.cameras.get(cameraId);
    if (!cam) return null;
    return cam.router.rtpCapabilities as RtpCapabilities;
  }

  // ─── Camera Ingest ───

  async ingestCamera(
    cameraId: string,
    streamUrl: string,
    streamConfig: { fps: number; width: number; height: number },
  ): Promise<IngestResult> {
    // If already ingesting, return existing
    const existing = this.cameras.get(cameraId);
    if (existing && existing.videoProducer) {
      return {
        routerId: existing.router.id,
        videoProducerId: existing.videoProducer.id,
        audioProducerId: existing.audioProducer?.id ?? null,
      };
    }

    const worker = this.getNextWorker();
    const router = await worker.createRouter({ mediaCodecs });
    logger.info(`[SFU] Router created for camera ${cameraId} on worker PID ${worker.pid}`);

    const cam: CameraRouter = {
      router,
      plainTransport: null,
      videoProducer: null,
      audioProducer: null,
      ffmpegProcess: null,
      ffmpegAudioProcess: null,
      viewerTransports: new Map(),
      consumers: new Map(),
      frameCount: 0,
      lastFpsCalc: Date.now(),
      currentFps: 0,
      audioPlainTransport: null,
    };
    this.cameras.set(cameraId, cam);

    // ── Create PlainRtpTransport for video ingest ──
    const plainTransport = await router.createPlainTransport({
      listenIp: { ip: config.mediasoupListenIp, announcedIp: config.mediasoupAnnouncedIp || undefined },
      rtcpMux: true,    // Mux RTP + RTCP on same port
      comedia: true,     // mediasoup learns FFmpeg's source address from first packet
    });
    cam.plainTransport = plainTransport;

    const videoPort = plainTransport.tuple.localPort;
    logger.info(`[SFU] PlainRtpTransport for ${cameraId}: port ${videoPort}`);

    // ── Create video Producer ──
    // We produce BEFORE FFmpeg sends data — mediasoup will buffer
    const videoProducer = await plainTransport.produce({
      kind: 'video',
      rtpParameters: {
        codecs: [
          {
            mimeType: 'video/H264',
            payloadType: 96,
            clockRate: 90000,
            parameters: {
              'packetization-mode': 1,
              'profile-level-id': '42e01f',
              'level-asymmetry-allowed': 1,
            },
          },
        ],
        encodings: [{ ssrc: 1111 }],
      },
    });
    cam.videoProducer = videoProducer;

    // Track FPS via Producer stats
    const fpsInterval = setInterval(async () => {
      if (!cam.videoProducer || cam.videoProducer.closed) {
        clearInterval(fpsInterval);
        return;
      }
      try {
        const stats = await cam.videoProducer.getStats();
        for (const stat of stats) {
          if (stat.type === 'inbound-rtp' && stat.kind === 'video') {
            const now = Date.now();
            const elapsed = (now - cam.lastFpsCalc) / 1000;
            if (elapsed >= 1) {
              const newFrames = (stat as any).framesDecoded ?? (stat as any).packetsReceived ?? 0;
              cam.currentFps = Math.round((newFrames - cam.frameCount) / elapsed);
              cam.frameCount = newFrames;
              cam.lastFpsCalc = now;
            }
          }
        }
      } catch { /* producer may have closed */ }
    }, 2000);

    // ── Launch FFmpeg: RTSP → RTP (zero transcode for H.264!) ──
    this.launchFFmpegVideo(cameraId, streamUrl, videoPort, streamConfig);

    // ── Try to extract audio ──
    let audioProducerId: string | null = null;
    try {
      audioProducerId = await this.setupAudioIngest(cameraId, streamUrl);
    } catch (err: any) {
      logger.warn(`[SFU] No audio for ${cameraId}: ${err.message}`);
    }

    return {
      routerId: router.id,
      videoProducerId: videoProducer.id,
      audioProducerId,
    };
  }

  private launchFFmpegVideo(
    cameraId: string,
    streamUrl: string,
    rtpPort: number,
    streamConfig: { fps: number; width: number; height: number },
  ): void {
    const cam = this.cameras.get(cameraId);
    if (!cam) return;

    const lower = streamUrl.toLowerCase();
    const inputArgs: string[] = [
      '-fflags', '+nobuffer+genpts',
      '-flags', 'low_delay',
      '-analyzeduration', '500000',
      '-probesize', '500000',
    ];

    const isFileLikeInput =
      !lower.includes('://') ||
      lower.startsWith('file:') ||
      /\.(mp4|mov|mkv|avi|webm|m4v)(\?.*)?$/.test(lower);
    if (isFileLikeInput) {
      inputArgs.push('-re');
    }

    if (lower.startsWith('rtsp://')) {
      inputArgs.push('-rtsp_transport', 'tcp', '-stimeout', '5000000');
    }
    if (lower.startsWith('http://') || lower.startsWith('https://')) {
      inputArgs.push('-reconnect', '1', '-reconnect_streamed', '1', '-reconnect_delay_max', '5');
    }

    inputArgs.push('-i', streamUrl);

    // ── KEY: -c:v copy means NO TRANSCODING ──
    // FFmpeg just repackages H.264 NALUs from RTSP into RTP packets.
    // If the camera outputs H.264 (vast majority of IP cameras), CPU usage ≈ 0%.
    //
    // Fallback: if camera uses non-H.264 (MJPEG, MPEG4), we must transcode.
    const outputArgs = [
      '-an',                        // No audio in video pipe
      '-c:v', 'copy',               // Zero-copy H.264 passthrough
      '-f', 'rtp',                   // RTP output
      '-payload_type', '96',
      '-ssrc', '1111',
      `rtp://127.0.0.1:${rtpPort}?pkt_size=1200`,
    ];

    const args = [...inputArgs, ...outputArgs];
    logger.info(`[SFU] FFmpeg video: ${config.ffmpegPath} ${args.join(' ')}`);

    const proc = spawn(config.ffmpegPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    cam.ffmpegProcess = proc;

    proc.stderr?.on('data', (data: Buffer) => {
      const line = data.toString().trim();
      if (/error|fatal|fail/i.test(line)) {
        logger.error(`[SFU][FFmpeg-${cameraId}] ${line}`);
      }
      // Detect if camera doesn't have H.264 and needs transcode
      if (/codec.*not.*h264|unknown.*codec/i.test(line)) {
        logger.warn(`[SFU] Camera ${cameraId} may need transcoding`);
        // Kill and restart with transcode
        proc.kill('SIGTERM');
        setTimeout(() => this.launchFFmpegVideoTranscode(cameraId, streamUrl, rtpPort, streamConfig), 1000);
      }
    });

    proc.on('close', (code) => {
      logger.warn(`[SFU] FFmpeg video for ${cameraId} exited (code ${code})`);
      if (cam.videoProducer && !cam.videoProducer.closed) {
        // Auto-reconnect
        setTimeout(() => {
          if (this.cameras.has(cameraId)) {
            logger.info(`[SFU] Reconnecting FFmpeg for ${cameraId}...`);
            this.launchFFmpegVideo(cameraId, streamUrl, rtpPort, streamConfig);
          }
        }, config.reconnectDelayMs);
      }
    });

    proc.on('error', (err) => {
      logger.error(`[SFU] FFmpeg spawn error for ${cameraId}: ${err.message}`);
    });
  }

  /**
   * Fallback: transcode non-H.264 cameras to H.264 for WebRTC compatibility.
   */
  private launchFFmpegVideoTranscode(
    cameraId: string,
    streamUrl: string,
    rtpPort: number,
    streamConfig: { fps: number; width: number; height: number },
  ): void {
    const cam = this.cameras.get(cameraId);
    if (!cam) return;

    const lower = streamUrl.toLowerCase();
    const inputArgs: string[] = [
      '-fflags', '+nobuffer+genpts',
      '-flags', 'low_delay',
      '-analyzeduration', '500000',
      '-probesize', '500000',
    ];

    const isFileLikeInput =
      !lower.includes('://') ||
      lower.startsWith('file:') ||
      /\.(mp4|mov|mkv|avi|webm|m4v)(\?.*)?$/.test(lower);
    if (isFileLikeInput) {
      inputArgs.push('-re');
    }

    if (lower.startsWith('rtsp://')) {
      inputArgs.push('-rtsp_transport', 'tcp', '-stimeout', '5000000');
    }

    inputArgs.push('-i', streamUrl);

    // Transcode to H.264 Constrained Baseline
    const outputArgs = [
      '-an',
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-tune', 'zerolatency',
      '-profile:v', 'baseline',
      '-level', '3.1',
      '-b:v', '2000k',
      '-maxrate', '2500k',
      '-bufsize', '4000k',
      '-g', String(streamConfig.fps * 2),   // Keyframe every 2 seconds
      '-vf', `fps=${streamConfig.fps},scale=${streamConfig.width}:${streamConfig.height}`,
      '-f', 'rtp',
      '-payload_type', '96',
      '-ssrc', '1111',
      `rtp://127.0.0.1:${rtpPort}?pkt_size=1200`,
    ];

    const args = [...inputArgs, ...outputArgs];
    logger.warn(`[SFU] FFmpeg transcoding for ${cameraId}: ${args.join(' ')}`);

    const proc = spawn(config.ffmpegPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    cam.ffmpegProcess = proc;

    proc.stderr?.on('data', (data: Buffer) => {
      const line = data.toString().trim();
      if (/error|fatal|fail/i.test(line)) {
        logger.error(`[SFU][FFmpeg-transcode-${cameraId}] ${line}`);
      }
    });

    proc.on('close', (code) => {
      logger.warn(`[SFU] FFmpeg transcode for ${cameraId} exited (code ${code})`);
    });
  }

  /**
   * Setup audio ingest: separate FFmpeg process → Opus → PlainRtpTransport → Producer
   */
  private async setupAudioIngest(cameraId: string, streamUrl: string): Promise<string | null> {
    const cam = this.cameras.get(cameraId);
    if (!cam) return null;

    const audioTransport = await cam.router.createPlainTransport({
      listenIp: { ip: config.mediasoupListenIp, announcedIp: config.mediasoupAnnouncedIp || undefined },
      rtcpMux: true,
      comedia: true,
    });
    cam.audioPlainTransport = audioTransport;

    const audioPort = audioTransport.tuple.localPort;

    // Create audio Producer
    const audioProducer = await audioTransport.produce({
      kind: 'audio',
      rtpParameters: {
        codecs: [
          {
            mimeType: 'audio/opus',
            payloadType: 111,
            clockRate: 48000,
            channels: 2,
            parameters: {
              minptime: 10,
              useinbandfec: 1,
            },
          },
        ],
        encodings: [{ ssrc: 2222 }],
      },
    });
    cam.audioProducer = audioProducer;

    // Launch FFmpeg for audio: transcode to Opus (WebRTC requires Opus)
    const lower = streamUrl.toLowerCase();
    const inputArgs: string[] = [
      '-fflags', '+nobuffer',
      '-flags', 'low_delay',
      '-analyzeduration', '500000',
      '-probesize', '500000',
    ];

    if (lower.startsWith('rtsp://')) {
      inputArgs.push('-rtsp_transport', 'tcp', '-stimeout', '5000000');
    }
    inputArgs.push('-i', streamUrl);

    const outputArgs = [
      '-vn',
      '-c:a', 'libopus',
      '-b:a', '48k',
      '-ar', '48000',
      '-ac', '2',
      '-application', 'lowdelay',
      '-f', 'rtp',
      '-payload_type', '111',
      '-ssrc', '2222',
      `rtp://127.0.0.1:${audioPort}?pkt_size=1200`,
    ];

    const args = [...inputArgs, ...outputArgs];
    logger.info(`[SFU] FFmpeg audio: ${config.ffmpegPath} ${args.join(' ')}`);

    const proc = spawn(config.ffmpegPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    cam.ffmpegAudioProcess = proc;

    proc.stderr?.on('data', (data: Buffer) => {
      const line = data.toString().trim();
      if (/no.*audio|error.*audio/i.test(line)) {
        logger.warn(`[SFU] No audio in ${cameraId}: ${line}`);
      }
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        logger.warn(`[SFU] Audio FFmpeg for ${cameraId} exited (code ${code})`);
      }
    });

    return audioProducer.id;
  }

  // ─── Stop Ingest ───

  stopIngest(cameraId: string): void {
    const cam = this.cameras.get(cameraId);
    if (!cam) return;

    // Kill FFmpeg processes
    if (cam.ffmpegProcess) {
      cam.ffmpegProcess.kill('SIGTERM');
      setTimeout(() => cam.ffmpegProcess?.kill('SIGKILL'), 3000);
    }
    if (cam.ffmpegAudioProcess) {
      cam.ffmpegAudioProcess.kill('SIGTERM');
      setTimeout(() => cam.ffmpegAudioProcess?.kill('SIGKILL'), 3000);
    }

    // Close all consumers
    for (const consumer of cam.consumers.values()) {
      consumer.close();
    }

    // Close all viewer transports
    for (const transport of cam.viewerTransports.values()) {
      transport.close();
    }

    // Close producers & transports
    cam.videoProducer?.close();
    cam.audioProducer?.close();
    cam.plainTransport?.close();
    cam.audioPlainTransport?.close();

    // Close router (releases all resources)
    cam.router.close();

    this.cameras.delete(cameraId);
    logger.info(`[SFU] Stopped ingest for camera ${cameraId}`);
  }

  // ─── Viewer Transport ───

  async createViewerTransport(cameraId: string): Promise<WebRtcTransportParams> {
    const cam = this.cameras.get(cameraId);
    if (!cam) throw new Error(`No router for camera ${cameraId}`);

    const transport = await cam.router.createWebRtcTransport({
      listenIps: [{ ip: config.mediasoupListenIp, announcedIp: config.mediasoupAnnouncedIp || undefined }],
      enableUdp: true,
      enableTcp: true,       // Fallback for restrictive firewalls
      preferUdp: true,
      initialAvailableOutgoingBitrate: 2_000_000,
      iceConsentTimeout: 25, // Close transport if ICE dies for 25s
    });

    cam.viewerTransports.set(transport.id, transport);

    // Auto-cleanup on transport close
    transport.on('routerclose', () => {
      cam.viewerTransports.delete(transport.id);
    });

    logger.info(`[SFU] WebRtcTransport created for ${cameraId}: ${transport.id}`);

    return {
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters,
    };
  }

  async connectViewerTransport(
    cameraId: string,
    transportId: string,
    dtlsParameters: DtlsParameters,
  ): Promise<void> {
    const cam = this.cameras.get(cameraId);
    if (!cam) throw new Error(`No router for camera ${cameraId}`);

    const transport = cam.viewerTransports.get(transportId);
    if (!transport) throw new Error(`Transport ${transportId} not found`);

    await transport.connect({ dtlsParameters: dtlsParameters as any });
    logger.info(`[SFU] Transport ${transportId} connected for ${cameraId}`);
  }

  async createConsumer(
    cameraId: string,
    transportId: string,
    producerId: string,
    rtpCapabilities: RtpCapabilities,
  ): Promise<ConsumerParams> {
    const cam = this.cameras.get(cameraId);
    if (!cam) throw new Error(`No router for camera ${cameraId}`);

    const transport = cam.viewerTransports.get(transportId);
    if (!transport) throw new Error(`Transport ${transportId} not found`);

    // Check if the router can consume this producer with the given caps
    if (!cam.router.canConsume({ producerId, rtpCapabilities: rtpCapabilities as any })) {
      throw new Error('Cannot consume: incompatible RTP capabilities');
    }

    const consumer = await transport.consume({
      producerId,
      rtpCapabilities: rtpCapabilities as any,
      paused: true, // Start paused; client will resume after setup
    });

    cam.consumers.set(consumer.id, consumer);

    consumer.on('transportclose', () => {
      cam.consumers.delete(consumer.id);
    });

    consumer.on('producerclose', () => {
      cam.consumers.delete(consumer.id);
    });

    logger.info(`[SFU] Consumer ${consumer.id} created (${consumer.kind}) for ${cameraId}`);

    return {
      id: consumer.id,
      producerId: consumer.producerId,
      kind: consumer.kind,
      rtpParameters: consumer.rtpParameters,
    };
  }

  async resumeConsumer(cameraId: string, consumerId: string): Promise<void> {
    const cam = this.cameras.get(cameraId);
    if (!cam) throw new Error(`No router for camera ${cameraId}`);

    const consumer = cam.consumers.get(consumerId);
    if (!consumer) throw new Error(`Consumer ${consumerId} not found`);

    await consumer.resume();
    logger.info(`[SFU] Consumer ${consumerId} resumed for ${cameraId}`);
  }

  closeViewerTransport(cameraId: string, transportId: string): void {
    const cam = this.cameras.get(cameraId);
    if (!cam) return;

    const transport = cam.viewerTransports.get(transportId);
    if (transport) {
      transport.close();
      cam.viewerTransports.delete(transportId);
      logger.info(`[SFU] Transport ${transportId} closed for ${cameraId}`);
    }
  }

  // ─── Queries ───

  isIngesting(cameraId: string): boolean {
    const cam = this.cameras.get(cameraId);
    return !!cam && !!cam.videoProducer && !cam.videoProducer.closed;
  }

  async getStats(cameraId: string): Promise<{
    currentFps: number;
    bitrate: number;
    viewerCount: number;
    hasAudio: boolean;
  } | null> {
    const cam = this.cameras.get(cameraId);
    if (!cam) return null;

    let bitrate = 0;
    try {
      if (cam.videoProducer && !cam.videoProducer.closed) {
        const stats = await cam.videoProducer.getStats();
        for (const stat of stats) {
          if ((stat as any).bitrate) {
            bitrate = (stat as any).bitrate;
          }
        }
      }
    } catch { /* ignore */ }

    return {
      currentFps: cam.currentFps,
      bitrate,
      viewerCount: cam.viewerTransports.size,
      hasAudio: !!cam.audioProducer && !cam.audioProducer.closed,
    };
  }

  // ─── Shutdown ───

  shutdown(): void {
    logger.info('[SFU] Shutting down all workers...');
    for (const cameraId of this.cameras.keys()) {
      this.stopIngest(cameraId);
    }
    for (const worker of this.workers) {
      worker.close();
    }
    this.workers = [];
    logger.info('[SFU] All workers closed');
  }
}
