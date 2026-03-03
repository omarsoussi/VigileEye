/**
 * Use case: Stop a camera stream.
 */
import { StreamSession } from '../../domain/entities/StreamSession';
import { StreamNotFoundError } from '../../domain/errors';
import { StreamManager } from '../../infrastructure/streaming/StreamManager';

export interface StopStreamInput {
  cameraId: string;
}

export class StopStreamUseCase {
  constructor(private readonly streamManager: StreamManager) {}

  execute(input: StopStreamInput): StreamSession {
    const session = this.streamManager.stopStream(input.cameraId);
    if (!session) {
      throw new StreamNotFoundError(input.cameraId);
    }
    return session;
  }
}
