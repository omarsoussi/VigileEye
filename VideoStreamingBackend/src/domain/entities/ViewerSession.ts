/**
 * Domain entity: Viewer session tracks a single WebRTC consumer connection.
 * Each viewer has a transport, a video consumer, and optionally an audio consumer.
 */

export interface ViewerSession {
  /** Unique viewer session ID */
  id: string;
  /** Camera being watched */
  cameraId: string;
  /** Authenticated user ID */
  userId: string;
  /** mediasoup WebRtcTransport ID */
  transportId: string;
  /** mediasoup video Consumer ID */
  videoConsumerId: string | null;
  /** mediasoup audio Consumer ID */
  audioConsumerId: string | null;
  /** Connection state */
  state: ViewerState;
  /** When the viewer connected */
  connectedAt: Date;
  /** Last ICE state update */
  lastActiveAt: Date;
  /** Client user-agent (for analytics) */
  userAgent: string | null;
}

export type ViewerState =
  | 'connecting'    // Transport created, ICE not complete
  | 'connected'     // DTLS established, consuming media
  | 'paused'        // Consumer paused (tab background, etc.)
  | 'disconnected'; // Transport closed
