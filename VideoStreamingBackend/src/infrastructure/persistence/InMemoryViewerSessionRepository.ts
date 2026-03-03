/**
 * In-memory viewer session repository.
 * Tracks active WebRTC viewer connections.
 */
import { IViewerSessionRepository } from '../../domain/repositories';
import { ViewerSession } from '../../domain/entities/ViewerSession';

export class InMemoryViewerSessionRepository implements IViewerSessionRepository {
  private sessions = new Map<string, ViewerSession>();

  get(viewerId: string): ViewerSession | undefined {
    return this.sessions.get(viewerId);
  }

  getByCamera(cameraId: string): ViewerSession[] {
    return Array.from(this.sessions.values()).filter((s) => s.cameraId === cameraId);
  }

  getByUser(userId: string): ViewerSession[] {
    return Array.from(this.sessions.values()).filter((s) => s.userId === userId);
  }

  save(session: ViewerSession): void {
    this.sessions.set(session.id, session);
  }

  remove(viewerId: string): void {
    this.sessions.delete(viewerId);
  }

  removeByCamera(cameraId: string): void {
    for (const [id, session] of this.sessions.entries()) {
      if (session.cameraId === cameraId) {
        this.sessions.delete(id);
      }
    }
  }
}
