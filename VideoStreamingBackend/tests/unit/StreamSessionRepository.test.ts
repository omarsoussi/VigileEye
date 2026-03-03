/**
 * Unit tests for InMemoryStreamSessionRepository.
 */
import { InMemoryStreamSessionRepository } from '../../src/infrastructure/persistence/InMemoryStreamSessionRepository';
import { StreamSession, DEFAULT_STREAM_CONFIG } from '../../src/domain/entities/StreamSession';

function makeSession(cameraId: string): StreamSession {
  return {
    id: `session-${cameraId}`,
    cameraId,
    ownerUserId: 'user-1',
    streamUrl: `rtsp://cam/${cameraId}`,
    status: 'active',
    config: { ...DEFAULT_STREAM_CONFIG },
    viewerCount: 0,
    startedAt: new Date(),
    lastFrameAt: null,
    stoppedAt: null,
    errorMessage: null,
    reconnectAttempts: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe('InMemoryStreamSessionRepository', () => {
  let repo: InMemoryStreamSessionRepository;

  beforeEach(() => {
    repo = new InMemoryStreamSessionRepository();
  });

  it('should save and retrieve a session', () => {
    const session = makeSession('cam-1');
    repo.save(session);
    expect(repo.get('cam-1')).toEqual(session);
  });

  it('should return undefined for unknown camera', () => {
    expect(repo.get('nonexistent')).toBeUndefined();
  });

  it('should list all sessions', () => {
    repo.save(makeSession('cam-1'));
    repo.save(makeSession('cam-2'));
    expect(repo.getAll()).toHaveLength(2);
  });

  it('should remove a session', () => {
    repo.save(makeSession('cam-1'));
    repo.remove('cam-1');
    expect(repo.get('cam-1')).toBeUndefined();
    expect(repo.getAll()).toHaveLength(0);
  });
});
