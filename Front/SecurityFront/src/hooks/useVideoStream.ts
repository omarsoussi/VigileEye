/**
 * Compatibility wrapper for useWebRTCStream.
 * Provides the old useVideoStream interface for backward compatibility.
 */
import { useCallback, useMemo, useRef, useEffect, useState } from 'react';
import { useWebRTCStream } from './useWebRTCStream';
import { CameraResponse, tokenStorage } from '../services/api';

export type StreamConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface UseVideoStreamOptions {
  camera: CameraResponse;
  autoConnect?: boolean;
  onFrame?: (frameBlob: Blob) => void;
  onError?: (error: Error) => void;
}

export interface UseVideoStreamResult {
  connectionState: StreamConnectionState;
  frameUrl: string | null;
  fps: number;
  frameCount: number;
  resolution: { width: number; height: number } | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  isStreaming: boolean;
  error: string | null;
  takeSnapshot: () => Blob | null;
  videoRef: React.RefObject<HTMLVideoElement>;
}

export function useVideoStream({
  camera,
  autoConnect = false,
  onFrame,
  onError,
}: UseVideoStreamOptions): UseVideoStreamResult {
  const authToken = tokenStorage.getAccessToken() || '';
  const [fps, setFps] = useState(0);
  const [frameCount, setFrameCount] = useState(0);
  const lastFrameBlobRef = useRef<Blob | null>(null);
  const frameCountRef = useRef(0);
  const lastFpsUpdateRef = useRef(Date.now());
  const lastFrameUrlRef = useRef<string | null>(null);

  const { videoRef, state, connect: streamConnect, disconnect: streamDisconnect } = useWebRTCStream({
    cameraId: camera.id,
    authToken,
    autoConnect,
  });

  // Map state to old connection state
  const connectionState: StreamConnectionState = useMemo(() => {
    if (state.error) return 'error';
    if (state.hasFrames) return 'connected';
    if (state.isConnected) return 'connected'; // WS open but no frames yet
    if (state.isConnecting) return 'connecting';
    return 'disconnected';
  }, [state.isConnecting, state.isConnected, state.hasFrames, state.error]);

  // Track FPS when frameUrl changes (client-side measurement)
  useEffect(() => {
    if (state.frameUrl && state.frameUrl !== lastFrameUrlRef.current) {
      lastFrameUrlRef.current = state.frameUrl;
      
      // Update FPS counter
      frameCountRef.current++;
      setFrameCount(prev => prev + 1);
      
      const now = Date.now();
      if (now - lastFpsUpdateRef.current >= 1000) {
        setFps(frameCountRef.current);
        frameCountRef.current = 0;
        lastFpsUpdateRef.current = now;
      }
    }
  }, [state.frameUrl]);

  // Prefer backend-reported FPS when available (more accurate)
  const effectiveFps = state.fps > 0 ? state.fps : fps;

  // Notify on error
  useEffect(() => {
    if (state.error && onError) {
      onError(new Error(state.error));
    }
  }, [state.error, onError]);

  const connect = useCallback(async () => {
    await streamConnect();
  }, [streamConnect]);

  const takeSnapshot = useCallback((): Blob | null => {
    return lastFrameBlobRef.current;
  }, []);

  return {
    connectionState,
    frameUrl: state.frameUrl,
    fps: effectiveFps,
    frameCount,
    resolution: null,
    connect,
    disconnect: streamDisconnect,
    isStreaming: state.hasFrames,
    error: state.error,
    takeSnapshot,
    videoRef,
  };
}

export default useVideoStream;
