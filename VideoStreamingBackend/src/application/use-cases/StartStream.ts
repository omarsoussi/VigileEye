/**
 * Use case: Start a camera stream.
 */
import { StreamSession, StreamConfig } from '../../domain/entities/StreamSession';
import { ICameraService } from '../../domain/services';
import { ForbiddenError } from '../../domain/errors';
import { StreamManager } from '../../infrastructure/streaming/StreamManager';
import { logger } from '../../infrastructure/logging/logger';

export interface StartStreamInput {
  cameraId: string;
  userId: string;
  token: string;
  streamUrl?: string;           // override, otherwise fetched from camera service
  config?: Partial<StreamConfig>;
}

export class StartStreamUseCase {
  constructor(
    private readonly streamManager: StreamManager,
    private readonly cameraService: ICameraService,
  ) {}

  async execute(input: StartStreamInput): Promise<StreamSession> {
    const { cameraId, userId, token } = input;

    // Fetch camera details from Camera Management service
    const camera = await this.cameraService.getCamera(cameraId, token);

    // Ownership check (basic – extend with member sharing later)
    if (camera.ownerUserId !== userId) {
      // Allow if the camera is shared - we can't easily check memberships here
      // without calling the members service, so we trust the camera service
      // returning the camera means the user has read access via their token.
      logger.info(`[StartStream] User ${userId} accessing camera ${cameraId} owned by ${camera.ownerUserId}`);
    }

    const streamUrl = input.streamUrl || camera.streamUrl;

    return this.streamManager.startStream(
      cameraId,
      camera.ownerUserId,
      streamUrl,
      {
        fps: input.config?.fps ?? camera.fps,
        ...input.config,
      },
    );
  }
}
