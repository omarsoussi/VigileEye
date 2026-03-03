/**
 * API request / response DTOs for the WebRTC streaming service.
 */
import { StreamSession, StreamStatus } from '../../domain/entities/StreamSession';

// ─── Requests ───

export interface StartStreamRequestDTO {
  camera_id: string;
  stream_url?: string;
  config?: {
    fps?: number;
    width?: number;
    height?: number;
    codec?: string;
    bitrate?: number;
  };
}

export interface StopStreamRequestDTO {
  camera_id: string;
}

// ─── Responses ───

export interface StreamSessionResponseDTO {
  id: string;
  camera_id: string;
  status: StreamStatus;
  fps: number;
  started_at: string | null;
  last_frame_at: string | null;
  stopped_at: string | null;
  error_message: string | null;
  reconnect_attempts: number;
  viewer_count: number;
  /** mediasoup Router ID */
  router_id: string | null;
  /** Video Producer ID (needed by viewers to consume) */
  video_producer_id: string | null;
  /** Audio Producer ID (null if no audio) */
  audio_producer_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface StreamStatusResponseDTO {
  camera_id: string;
  is_streaming: boolean;
  status: string;
  session: StreamSessionResponseDTO | null;
  /** WebRTC signaling URL (instead of WS frame URL) */
  signaling_url: string | null;
}

export interface ActiveStreamsResponseDTO {
  count: number;
  streams: StreamSessionResponseDTO[];
}

export interface RealTimeInfoDTO {
  camera_id: string;
  is_streaming: boolean;
  current_fps: number;
  viewer_count: number;
  has_audio: boolean;
  status: string;
  uptime: number;
  bitrate: number;
}

// ─── Signaling DTOs (WebSocket messages) ───

export interface SignalingMessage {
  type: string;
  [key: string]: any;
}

export interface RouterCapabilitiesMessage {
  type: 'router-rtp-capabilities';
  rtpCapabilities: any;
  videoProducerId: string | null;
  audioProducerId: string | null;
}

export interface CreateTransportResponse {
  type: 'transport-created';
  transportId: string;
  iceParameters: any;
  iceCandidates: any[];
  dtlsParameters: any;
  iceServers: any[];
}

export interface ConsumerCreatedResponse {
  type: 'consumer-created';
  consumerId: string;
  producerId: string;
  kind: 'video' | 'audio';
  rtpParameters: any;
}

// ─── Mappers ───

export function toSessionDTO(s: StreamSession): StreamSessionResponseDTO {
  return {
    id: s.id,
    camera_id: s.cameraId,
    status: s.status,
    fps: s.config.fps,
    started_at: s.startedAt?.toISOString() ?? null,
    last_frame_at: s.lastFrameAt?.toISOString() ?? null,
    stopped_at: s.stoppedAt?.toISOString() ?? null,
    error_message: s.errorMessage,
    reconnect_attempts: s.reconnectAttempts,
    viewer_count: s.viewerCount,
    router_id: s.routerId,
    video_producer_id: s.videoProducerId,
    audio_producer_id: s.audioProducerId,
    created_at: s.createdAt.toISOString(),
    updated_at: s.updatedAt.toISOString(),
  };
}
