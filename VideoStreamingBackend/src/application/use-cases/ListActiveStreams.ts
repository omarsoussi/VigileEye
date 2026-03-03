/**
 * Use case: List all active streams.
 */
import { StreamSession } from '../../domain/entities/StreamSession';
import { StreamManager } from '../../infrastructure/streaming/StreamManager';

export class ListActiveStreamsUseCase {
  constructor(private readonly streamManager: StreamManager) {}

  execute(): { count: number; streams: StreamSession[] } {
    const streams = this.streamManager.getAllSessions();
    return { count: streams.length, streams };
  }
}
