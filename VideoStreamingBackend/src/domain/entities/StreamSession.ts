/**
 * Video Streaming Service — Domain Layer
 * Stream entity representing an active camera ingest + SFU routing session.
 *
 * In the WebRTC architecture:
 * - Each camera has ONE StreamSession (ingest via FFmpeg → RTP → mediasoup Producer)
 * - Multiple ViewerSessions consume from the same Producer
 * - The StreamManager orchestrates lifecycle; mediasoup handles media routing.
 */

export type StreamStatus =
  | 'pending'       // Created, not yet ingesting
  | 'connecting'    // FFmpeg starting / probing RTSP
  | 'active'        // RTP flowing, Producer receiving frames
  | 'reconnecting'  // FFmpeg died, auto-reconnect in progress
  | 'stopped'       // Intentionally stopped
  | 'error';        // Unrecoverable error

export interface StreamConfig {
  fps: number;
  width: number;
  height: number;
  codec: string;
  bitrate: number;
}

export interface StreamSession {
  /** Unique session ID (UUID) */
  id: string;
  /** Camera being streamed */
  cameraId: string;
  /** Camera owner's user ID */
  ownerUserId: string;
  /** RTSP/HTTP source URL */
  streamUrl: string;
  /** Current session status */
  status: StreamStatus;
  /** Stream configuration */
  config: StreamConfig;
  /** Number of active WebRTC consumers */
  viewerCount: number;

  // ─── mediasoup references (set after ingest starts) ───
  /** mediasoup Router ID for this camera */
  routerId: string | null;
  /** mediasoup video Producer ID */
  videoProducerId: string | null;
  /** mediasoup audio Producer ID (null if camera has no audio) */
  audioProducerId: string | null;

  // ─── Timestamps ───
  startedAt: Date | null;
  lastFrameAt: Date | null;
  stoppedAt: Date | null;

  // ─── Error / reconnect tracking ───
  errorMessage: string | null;
  reconnectAttempts: number;

  // ─── Metadata ───
  createdAt: Date;
  updatedAt: Date;
}

export const DEFAULT_STREAM_CONFIG: StreamConfig = {
  fps: 15,
  width: 1280,
  height: 720,
  codec: 'h264',
  bitrate: 2_000_000,
};
