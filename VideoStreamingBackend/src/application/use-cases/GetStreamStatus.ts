/**
 * Use case: Get stream status for a camera.
 * Returns session info including WebRTC signaling URL.
 */
import { StreamSession } from '../../domain/entities/StreamSession';
import { StreamManager } from '../../infrastructure/streaming/StreamManager';

export interface StreamStatusResult {
  cameraId: string;
  isStreaming: boolean;
  status: string;
  session: StreamSession | null;
  /** WebRTC signaling URL (replaces old websocket_url for JPEG frames) */
  signalingUrl: string | null;
}

export class GetStreamStatusUseCase {
  constructor(private readonly streamManager: StreamManager) {}

  execute(cameraId: string): StreamStatusResult {
    const session = this.streamManager.getSession(cameraId) ?? null;
    const isStreaming = this.streamManager.isStreaming(cameraId);

    return {
      cameraId,
      isStreaming,
      status: session?.status ?? 'stopped',
      session,
      signalingUrl: isStreaming ? `/ws/signaling/${cameraId}` : null,
    };
  }
}
