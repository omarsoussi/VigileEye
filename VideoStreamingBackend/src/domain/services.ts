/**
 * Service interfaces (ports) consumed by the application layer.
 * These define the contracts that infrastructure adapters must fulfill.
 */
import { Camera } from './entities/Camera';

// ─── Auth ───
export interface AuthPayload {
  sub: string;        // user id
  email: string;
  type: string;       // "access"
}

export interface IAuthService {
  validateToken(token: string): AuthPayload;
}

// ─── Camera Management ───
export interface ICameraService {
  getCamera(cameraId: string, token: string): Promise<Camera>;
  getCamerasForUser(userId: string, token: string): Promise<Camera[]>;
}

// ─── SFU (mediasoup abstraction) ───

/** Router-level RTP capabilities (codec support) */
export interface RtpCapabilities {
  codecs: any[];
  headerExtensions?: any[];
}

/** Parameters needed by the browser to create a RecvTransport */
export interface WebRtcTransportParams {
  id: string;
  iceParameters: any;
  iceCandidates: any[];
  dtlsParameters: any;
  sctpParameters?: any;
}

/** DTLS parameters sent by the browser after creating its local transport */
export interface DtlsParameters {
  role?: string;
  fingerprints: Array<{ algorithm: string; value: string }>;
}

/** Parameters needed to create a Consumer on the server */
export interface ConsumerParams {
  id: string;
  producerId: string;
  kind: 'video' | 'audio';
  rtpParameters: any;
}

/** Result of ingesting an RTSP stream */
export interface IngestResult {
  routerId: string;
  videoProducerId: string;
  audioProducerId: string | null;
}

/**
 * ISFUService — Port for the Selective Forwarding Unit.
 *
 * The application layer uses this to manage media routing
 * without depending on mediasoup directly.
 */
export interface ISFUService {
  /** Initialize workers (called once at boot) */
  init(): Promise<void>;

  /** Get router RTP capabilities for a camera */
  getRouterRtpCapabilities(cameraId: string): RtpCapabilities | null;

  /** Ingest RTSP stream into a Router via PlainRtpTransport + Producer */
  ingestCamera(cameraId: string, streamUrl: string, config: { fps: number; width: number; height: number }): Promise<IngestResult>;

  /** Stop ingesting a camera (kill FFmpeg, close transports, remove Router) */
  stopIngest(cameraId: string): void;

  /** Create a WebRTC transport for a viewer */
  createViewerTransport(cameraId: string): Promise<WebRtcTransportParams>;

  /** Connect a viewer transport (ICE + DTLS established) */
  connectViewerTransport(cameraId: string, transportId: string, dtlsParameters: DtlsParameters): Promise<void>;

  /** Create a Consumer for a viewer (subscribe to Producer) */
  createConsumer(
    cameraId: string,
    transportId: string,
    producerId: string,
    rtpCapabilities: RtpCapabilities,
  ): Promise<ConsumerParams>;

  /** Resume a paused consumer */
  resumeConsumer(cameraId: string, consumerId: string): Promise<void>;

  /** Close a viewer's transport (disconnects all consumers) */
  closeViewerTransport(cameraId: string, transportId: string): void;

  /** Check if a camera is currently being ingested */
  isIngesting(cameraId: string): boolean;

  /** Get real-time stats */
  getStats(cameraId: string): Promise<{
    currentFps: number;
    bitrate: number;
    viewerCount: number;
    hasAudio: boolean;
  } | null>;

  /** Clean shutdown */
  shutdown(): void;
}
