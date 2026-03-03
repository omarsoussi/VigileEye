/**
 * In-memory stream session repository.
 * Production: swap for Redis-backed implementation.
 */
import { IStreamSessionRepository } from '../../domain/repositories';
import { StreamSession } from '../../domain/entities/StreamSession';

export class InMemoryStreamSessionRepository implements IStreamSessionRepository {
  private sessions = new Map<string, StreamSession>();

  get(cameraId: string): StreamSession | undefined {
    return this.sessions.get(cameraId);
  }

  getAll(): StreamSession[] {
    return Array.from(this.sessions.values());
  }

  save(session: StreamSession): void {
    this.sessions.set(session.cameraId, session);
  }

  remove(cameraId: string): void {
    this.sessions.delete(cameraId);
  }
}
