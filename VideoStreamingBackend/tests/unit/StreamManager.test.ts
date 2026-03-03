/**
 * Unit tests for StreamManager.
 */
jest.mock('../../src/infrastructure/config', () => ({
  config: {
    ffmpegPath: 'ffmpeg',
    defaultFps: 15,
    defaultWidth: 1280,
    defaultHeight: 720,
    maxReconnectAttempts: 3,
    reconnectDelayMs: 100,
  },
}));

jest.mock('../../src/infrastructure/logging/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import { StreamManager } from '../../src/infrastructure/streaming/StreamManager';
import { InMemoryStreamSessionRepository } from '../../src/infrastructure/persistence/InMemoryStreamSessionRepository';

describe('StreamManager', () => {
  let manager: StreamManager;
  let repo: InMemoryStreamSessionRepository;

  beforeEach(() => {
    repo = new InMemoryStreamSessionRepository();
    manager = new StreamManager(repo);
  });

  afterEach(() => {
    manager.stopAll();
  });

  it('should create a session when starting a stream', () => {
    // Note: FFmpeg will fail immediately if not installed, but the session is created
    const session = manager.startStream('cam-1', 'user-1', 'rtsp://test/stream');
    expect(session.cameraId).toBe('cam-1');
    expect(session.status).toBe('connecting');
    expect(repo.get('cam-1')).toBeDefined();
  });

  it('should return existing session if already running', () => {
    const s1 = manager.startStream('cam-1', 'user-1', 'rtsp://test/stream');
    const s2 = manager.startStream('cam-1', 'user-1', 'rtsp://test/stream');
    // Same session returned (FFmpeg won't actually be running in tests)
    expect(s2.id).toBe(s1.id);
  });

  it('should stop a stream', () => {
    manager.startStream('cam-1', 'user-1', 'rtsp://test/stream');
    const stopped = manager.stopStream('cam-1');
    expect(stopped).not.toBeNull();
    expect(stopped!.status).toBe('stopped');
  });

  it('should return null when stopping nonexistent stream', () => {
    expect(manager.stopStream('nonexistent')).toBeNull();
  });

  it('should list all sessions', () => {
    manager.startStream('cam-1', 'user-1', 'rtsp://test/1');
    manager.startStream('cam-2', 'user-1', 'rtsp://test/2');
    expect(manager.getAllSessions()).toHaveLength(2);
  });

  it('should track viewer count', () => {
    manager.startStream('cam-1', 'user-1', 'rtsp://test/stream');
    manager.addViewer('cam-1');
    manager.addViewer('cam-1');
    expect(manager.getSession('cam-1')?.viewerCount).toBe(2);
    manager.removeViewer('cam-1');
    expect(manager.getSession('cam-1')?.viewerCount).toBe(1);
  });
});
