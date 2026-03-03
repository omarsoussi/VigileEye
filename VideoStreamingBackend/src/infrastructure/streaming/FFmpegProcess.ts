/**
 * FFmpegProcess – spawns FFmpeg to pull an RTSP/HTTP camera stream
 * and outputs raw MJPEG frames to stdout which we forward to viewers.
 *
 * AudioExtractor – separate FFmpeg for PCM audio extraction.
 *
 * Why MJPEG over raw H.264 NALU forwarding?
 * - Universally decodable in <img> and canvas without MSE/WebCodecs.
 * - Works through Docker NAT, proxies, every browser.
 * - For 10-50 cameras at 10-15 FPS this is perfectly viable.
 */

import { ChildProcess, spawn } from 'child_process';
import { EventEmitter } from 'events';
import { config } from '../config';
import { logger } from '../logging/logger';

// JPEG SOI / EOI markers
const JPEG_SOI = Buffer.from([0xff, 0xd8]);
const JPEG_EOI = Buffer.from([0xff, 0xd9]);

export interface FFmpegProcessOptions {
  streamUrl: string;
  fps: number;
  width: number;
  height: number;
  /** Extra FFmpeg input args (e.g. -rtsp_transport tcp) */
  extraInputArgs?: string[];
  /** Enable hardware decoding when available */
  hwAccel?: boolean;
}

export class FFmpegProcess extends EventEmitter {
  private process: ChildProcess | null = null;
  private buffer: Buffer = Buffer.alloc(0);
  private _running = false;

  get running(): boolean {
    return this._running;
  }

  start(opts: FFmpegProcessOptions): void {
    if (this._running) return;

    const {
      streamUrl,
      fps,
      width,
      height,
      extraInputArgs = [],
      hwAccel = false,
    } = opts;

    const inputArgs: string[] = [];

    // Hardware acceleration (NVIDIA)
    if (hwAccel) {
      inputArgs.push('-hwaccel', 'cuda', '-hwaccel_output_format', 'cuda');
    }

    // Low-latency input tuning
    inputArgs.push(
      '-fflags', '+nobuffer+genpts',
      '-flags', 'low_delay',
      '-max_delay', '0',
      '-analyzeduration', '1000000',
      '-probesize', '1000000',
      '-thread_queue_size', '512',
    );

    // Protocol-specific flags
    const lower = streamUrl.toLowerCase();
    const isFileLikeInput =
      !lower.includes('://') ||
      lower.startsWith('file:') ||
      /\.(mp4|mov|mkv|avi|webm|m4v)(\?.*)?$/.test(lower);
    if (isFileLikeInput) {
      // Ensure file inputs are read at real-time speed (1x)
      inputArgs.push('-re');
    }
    if (lower.startsWith('rtsp://')) {
      inputArgs.push('-rtsp_transport', 'tcp', '-stimeout', '5000000');
    }
    if (lower.startsWith('http://') || lower.startsWith('https://')) {
      inputArgs.push('-reconnect', '1', '-reconnect_streamed', '1', '-reconnect_delay_max', '5');
    }

    inputArgs.push(...extraInputArgs, '-i', streamUrl);

    // Output: MJPEG frames to stdout – improved quality & smoothness
    const outputArgs = [
      '-f', 'image2pipe',
      '-vcodec', 'mjpeg',
      '-q:v', '5',           // quality (2=best, 31=worst) – tuned for lower bandwidth/latency
      '-vf', `fps=${fps},scale=${width}:${height}:flags=fast_bilinear`,
      '-vsync', '0',         // don't buffer to match a target CFR
      '-fflags', 'nobuffer',
      '-an',                  // no audio in video pipe (audio handled separately)
      'pipe:1',
    ];

    const args = [...inputArgs, ...outputArgs];
    logger.info(`[FFmpeg] Spawning: ffmpeg ${args.join(' ')}`);

    const proc = spawn(config.ffmpegPath, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    this.process = proc;
    this._running = true;

    proc.stdout!.on('data', (chunk: Buffer) => {
      this.buffer = Buffer.concat([this.buffer, chunk]);
      this.extractFrames();
    });

    proc.stderr!.on('data', (data: Buffer) => {
      const line = data.toString().trim();
      if (line) {
        // FFmpeg logs to stderr; only log errors / warnings
        if (/error|fatal|fail/i.test(line)) {
          logger.error(`[FFmpeg] ${line}`);
        }
      }
    });

    proc.on('close', (code) => {
      this._running = false;
      logger.info(`[FFmpeg] Process exited with code ${code}`);
      this.emit('close', code);
    });

    proc.on('error', (err) => {
      this._running = false;
      logger.error(`[FFmpeg] Process error: ${err.message}`);
      this.emit('error', err);
    });
  }

  stop(): void {
    if (this.process && this._running) {
      this.process.kill('SIGTERM');
      // Force-kill after 3 s
      const killTimer = setTimeout(() => {
        if (this.process && this._running) {
          this.process.kill('SIGKILL');
        }
      }, 3000);
      killTimer.unref(); // Don't keep process alive for this
    }
    this._running = false;
    this.buffer = Buffer.alloc(0);
  }

  /**
   * Extract complete JPEG frames from the buffer.
   */
  private extractFrames(): void {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const soiIndex = this.buffer.indexOf(JPEG_SOI);
      if (soiIndex === -1) {
        this.buffer = Buffer.alloc(0);
        break;
      }

      const eoiIndex = this.buffer.indexOf(JPEG_EOI, soiIndex + 2);
      if (eoiIndex === -1) break; // incomplete frame

      const frame = this.buffer.subarray(soiIndex, eoiIndex + 2);
      this.emit('frame', Buffer.from(frame)); // copy to decouple

      this.buffer = this.buffer.subarray(eoiIndex + 2);
    }
  }
}

/**
 * AudioExtractor – extracts audio from a camera stream as PCM float32
 * and emits chunks over a separate FFmpeg process.
 */
export class AudioExtractor extends EventEmitter {
  private process: ChildProcess | null = null;
  private _running = false;

  get running(): boolean {
    return this._running;
  }

  start(streamUrl: string, sampleRate = 48000, channels = 1): void {
    if (this._running) return;

    const inputArgs: string[] = [
      '-fflags', '+nobuffer',
      '-flags', 'low_delay',
      '-analyzeduration', '1000000',
      '-probesize', '1000000',
    ];

    const lower = streamUrl.toLowerCase();
    if (lower.startsWith('rtsp://')) {
      inputArgs.push('-rtsp_transport', 'tcp', '-stimeout', '5000000');
    }
    if (lower.startsWith('http://') || lower.startsWith('https://')) {
      inputArgs.push('-reconnect', '1', '-reconnect_streamed', '1', '-reconnect_delay_max', '5');
    }

    inputArgs.push('-i', streamUrl);

    // Output raw PCM float32 to stdout
    const outputArgs = [
      '-vn',                       // no video
      '-acodec', 'pcm_f32le',     // raw float32 little-endian
      '-ar', String(sampleRate),
      '-ac', String(channels),
      '-f', 'f32le',
      'pipe:1',
    ];

    const args = [...inputArgs, ...outputArgs];
    logger.info(`[AudioFFmpeg] Spawning: ffmpeg ${args.join(' ')}`);

    const proc = spawn(config.ffmpegPath, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    this.process = proc;
    this._running = true;

    // Emit audio data in small chunks (~20ms at 48kHz mono = 3840 bytes)
    const CHUNK_SIZE = sampleRate * channels * 4 * 0.02; // 20ms of float32
    let audioBuffer = Buffer.alloc(0);

    proc.stdout!.on('data', (chunk: Buffer) => {
      audioBuffer = Buffer.concat([audioBuffer, chunk]);
      while (audioBuffer.length >= CHUNK_SIZE) {
        const audioChunk = audioBuffer.subarray(0, CHUNK_SIZE);
        this.emit('audio', Buffer.from(audioChunk));
        audioBuffer = audioBuffer.subarray(CHUNK_SIZE);
      }
    });

    proc.stderr!.on('data', (data: Buffer) => {
      const line = data.toString().trim();
      if (line && /error|fatal|fail|no.*audio/i.test(line)) {
        logger.warn(`[AudioFFmpeg] ${line}`);
      }
    });

    proc.on('close', (code) => {
      this._running = false;
      logger.info(`[AudioFFmpeg] Process exited with code ${code}`);
      this.emit('close', code);
    });

    proc.on('error', (err) => {
      this._running = false;
      logger.error(`[AudioFFmpeg] Process error: ${err.message}`);
      this.emit('error', err);
    });
  }

  stop(): void {
    if (this.process && this._running) {
      this.process.kill('SIGTERM');
      const killTimer = setTimeout(() => {
        if (this.process && this._running) {
          this.process.kill('SIGKILL');
        }
      }, 3000);
      killTimer.unref();
    }
    this._running = false;
  }
}

/**
 * ProbeStream - use ffprobe to check if a stream is reachable and get its metadata.
 */
export async function probeStream(streamUrl: string): Promise<{
  reachable: boolean;
  hasVideo: boolean;
  hasAudio: boolean;
  videoCodec?: string;
  audioCodec?: string;
  audioSampleRate?: number;
  audioChannels?: number;
  width?: number;
  height?: number;
  fps?: number;
}> {
  return new Promise((resolve) => {
    const args = [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_streams',
      '-show_format',
      '-timeout', '5000000',
    ];
    
    const lower = streamUrl.toLowerCase();
    if (lower.startsWith('rtsp://')) {
      args.push('-rtsp_transport', 'tcp');
    }
    args.push(streamUrl);

    const proc = spawn(config.ffprobePath, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let output = '';
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      proc.kill('SIGKILL');
      resolve({ reachable: false, hasVideo: false, hasAudio: false });
    }, 8000);
    timer.unref();

    proc.stdout!.on('data', (data: Buffer) => {
      output += data.toString();
    });

    proc.on('close', (code) => {
      clearTimeout(timer);
      if (timedOut) return;

      if (code !== 0 || !output) {
        resolve({ reachable: false, hasVideo: false, hasAudio: false });
        return;
      }

      try {
        const info = JSON.parse(output);
        const streams = info.streams || [];
        const videoStream = streams.find((s: any) => s.codec_type === 'video');
        const audioStream = streams.find((s: any) => s.codec_type === 'audio');

        let fps: number | undefined;
        if (videoStream?.r_frame_rate) {
          const [num, den] = videoStream.r_frame_rate.split('/').map(Number);
          fps = den ? Math.round(num / den) : num;
        }

        resolve({
          reachable: true,
          hasVideo: !!videoStream,
          hasAudio: !!audioStream,
          videoCodec: videoStream?.codec_name,
          audioCodec: audioStream?.codec_name,
          audioSampleRate: audioStream?.sample_rate ? Number(audioStream.sample_rate) : undefined,
          audioChannels: audioStream?.channels ? Number(audioStream.channels) : undefined,
          width: videoStream?.width,
          height: videoStream?.height,
          fps,
        });
      } catch {
        resolve({ reachable: true, hasVideo: false, hasAudio: false });
      }
    });

    proc.on('error', () => {
      clearTimeout(timer);
      resolve({ reachable: false, hasVideo: false, hasAudio: false });
    });
  });
}
