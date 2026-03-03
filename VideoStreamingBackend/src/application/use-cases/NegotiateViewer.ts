/**
 * Use case: Negotiate a WebRTC viewer connection.
 *
 * This use case is called from the signaling WebSocket handler.
 * It delegates transport/consumer creation to the StreamManager → SFU.
 */
import { StreamManager } from '../../infrastructure/streaming/StreamManager';
import { ICameraService } from '../../domain/services';
import { StreamNotFoundError, ProducerNotFoundError } from '../../domain/errors';
import { logger } from '../../infrastructure/logging/logger';
import type {
  RtpCapabilities,
  WebRtcTransportParams,
  DtlsParameters,
  ConsumerParams,
} from '../../domain/services';

export interface NegotiateViewerInput {
  cameraId: string;
  userId: string;
  token: string;
}

export class NegotiateViewerUseCase {
  constructor(
    private readonly streamManager: StreamManager,
    private readonly cameraService: ICameraService,
  ) {}

  /**
   * Ensure the camera stream is active and return Router RTP capabilities.
   * Called when a viewer first connects.
   */
  async ensureStreamAndGetCapabilities(input: NegotiateViewerInput): Promise<{
    rtpCapabilities: RtpCapabilities;
    videoProducerId: string | null;
    audioProducerId: string | null;
  }> {
    const { cameraId, userId, token } = input;

    // Auto-start ingest if not running
    if (!this.streamManager.isStreaming(cameraId)) {
      logger.info(`[NegotiateViewer] Auto-starting stream for ${cameraId}`);
      const camera = await this.cameraService.getCamera(cameraId, token);
      await this.streamManager.startStream(cameraId, camera.ownerUserId, camera.streamUrl, {
        fps: camera.fps,
      });
    }

    const rtpCapabilities = this.streamManager.getRouterRtpCapabilities(cameraId);
    if (!rtpCapabilities) {
      throw new StreamNotFoundError(cameraId);
    }

    const session = this.streamManager.getSession(cameraId);

    return {
      rtpCapabilities,
      videoProducerId: session?.videoProducerId ?? null,
      audioProducerId: session?.audioProducerId ?? null,
    };
  }

  /**
   * Create a WebRtcTransport for the viewer.
   */
  async createTransport(cameraId: string): Promise<WebRtcTransportParams> {
    return this.streamManager.createViewerTransport(cameraId);
  }

  /**
   * Connect the viewer's transport (DTLS handshake).
   */
  async connectTransport(
    cameraId: string,
    transportId: string,
    dtlsParameters: DtlsParameters,
  ): Promise<void> {
    return this.streamManager.connectViewerTransport(cameraId, transportId, dtlsParameters);
  }

  /**
   * Create a Consumer so the viewer receives media.
   */
  async consume(
    cameraId: string,
    transportId: string,
    producerId: string,
    rtpCapabilities: RtpCapabilities,
  ): Promise<ConsumerParams> {
    if (!producerId) {
      throw new ProducerNotFoundError(cameraId);
    }
    return this.streamManager.createConsumer(cameraId, transportId, producerId, rtpCapabilities);
  }

  /**
   * Resume a paused Consumer (starts media flow).
   */
  async resumeConsumer(cameraId: string, consumerId: string): Promise<void> {
    return this.streamManager.resumeConsumer(cameraId, consumerId);
  }

  /**
   * Clean up when viewer disconnects.
   */
  disconnect(cameraId: string, transportId: string): void {
    this.streamManager.closeViewerTransport(cameraId, transportId);
    this.streamManager.removeViewer(cameraId);
  }
}
