/**
 * Repository interfaces (ports) for the domain layer.
 */
import { StreamSession } from './entities/StreamSession';
import { ViewerSession } from './entities/ViewerSession';

export interface IStreamSessionRepository {
  get(cameraId: string): StreamSession | undefined;
  getAll(): StreamSession[];
  save(session: StreamSession): void;
  remove(cameraId: string): void;
}

export interface IViewerSessionRepository {
  get(viewerId: string): ViewerSession | undefined;
  getByCamera(cameraId: string): ViewerSession[];
  getByUser(userId: string): ViewerSession[];
  save(session: ViewerSession): void;
  remove(viewerId: string): void;
  removeByCamera(cameraId: string): void;
}
