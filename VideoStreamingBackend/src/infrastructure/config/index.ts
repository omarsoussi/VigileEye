/**
 * Application configuration loaded from env.
 * Includes mediasoup / WebRTC settings for the SFU-based architecture.
 */
import dotenv from 'dotenv';
import os from 'os';
dotenv.config();

export interface AppConfig {
  port: number;
  nodeEnv: string;

  jwtSecret: string;
  jwtAlgorithm: string;

  cameraServiceUrl: string;
  authServiceUrl: string;

  ffmpegPath: string;
  ffprobePath: string;

  // ─── ICE / TURN ───
  stunServer: string;
  turnServer: string | null;
  turnUsername: string | null;
  turnCredential: string | null;

  // ─── Stream defaults ───
  defaultFps: number;
  defaultWidth: number;
  defaultHeight: number;
  maxReconnectAttempts: number;
  reconnectDelayMs: number;

  // ─── mediasoup ───
  mediasoupNumWorkers: number;
  mediasoupListenIp: string;
  mediasoupAnnouncedIp: string | null;
  rtcMinPort: number;
  rtcMaxPort: number;
  mediasoupLogLevel: string;

  logLevel: string;
}

function env(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

function envInt(key: string, fallback: number): number {
  const v = process.env[key];
  return v ? parseInt(v, 10) : fallback;
}

export const config: AppConfig = {
  port: envInt('PORT', 8003),
  nodeEnv: env('NODE_ENV', 'development'),

  jwtSecret: env('JWT_SECRET_KEY', 'your-super-secret-jwt-key-change-in-production-min-32-chars'),
  jwtAlgorithm: env('JWT_ALGORITHM', 'HS256'),

  cameraServiceUrl: env('CAMERA_SERVICE_URL', 'http://localhost:8002'),
  authServiceUrl: env('AUTH_SERVICE_URL', 'http://localhost:8000'),

  ffmpegPath: env('FFMPEG_PATH', 'ffmpeg'),
  ffprobePath: env('FFMPEG_PROBE_PATH', 'ffprobe'),

  stunServer: env('STUN_SERVER', 'stun:stun.l.google.com:19302'),
  turnServer: process.env.TURN_SERVER || null,
  turnUsername: process.env.TURN_USERNAME || null,
  turnCredential: process.env.TURN_CREDENTIAL || null,

  // Lower defaults = lower CPU/bandwidth and less end-to-end latency (esp. mobile).
  defaultFps: envInt('DEFAULT_FPS', 10),
  defaultWidth: envInt('DEFAULT_WIDTH', 640),
  defaultHeight: envInt('DEFAULT_HEIGHT', 360),
  maxReconnectAttempts: envInt('MAX_RECONNECT_ATTEMPTS', 10),
  reconnectDelayMs: envInt('RECONNECT_DELAY_MS', 3000),

  // ─── mediasoup ───
  mediasoupNumWorkers: envInt('MEDIASOUP_NUM_WORKERS', Math.max(1, os.cpus().length)),
  mediasoupListenIp: env('MEDIASOUP_LISTEN_IP', '0.0.0.0'),
  mediasoupAnnouncedIp: process.env.MEDIASOUP_ANNOUNCED_IP || null,
  rtcMinPort: envInt('RTC_MIN_PORT', 40000),
  rtcMaxPort: envInt('RTC_MAX_PORT', 40100),
  mediasoupLogLevel: env('MEDIASOUP_LOG_LEVEL', 'warn'),

  logLevel: env('LOG_LEVEL', 'info'),
};

/**
 * mediasoup Router media codecs — what we support.
 * H.264 Constrained Baseline for maximum browser + mobile compatibility.
 * Opus for audio (WebRTC standard).
 */
export const mediaCodecs: any[] = [
  {
    kind: 'video',
    mimeType: 'video/H264',
    clockRate: 90000,
    parameters: {
      'packetization-mode': 1,
      'profile-level-id': '42e01f',   // Constrained Baseline Level 3.1
      'level-asymmetry-allowed': 1,
    },
  },
  {
    kind: 'video',
    mimeType: 'video/H264',
    clockRate: 90000,
    parameters: {
      'packetization-mode': 1,
      'profile-level-id': '4d0032',   // Main Profile Level 5
      'level-asymmetry-allowed': 1,
    },
  },
  {
    kind: 'audio',
    mimeType: 'audio/opus',
    clockRate: 48000,
    channels: 2,
  },
];
