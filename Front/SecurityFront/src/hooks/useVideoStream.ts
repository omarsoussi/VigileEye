/**
 * Custom hook for managing video stream WebSocket connections.
 * 
 * This hook handles:
 * - WebSocket connection lifecycle
 * - Automatic reconnection
 * - Frame rendering to canvas
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { streamingApi, CameraResponse } from '../services/api';

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
  connect: () => Promise<void>;
  disconnect: () => void;
  isStreaming: boolean;
  error: string | null;
  takeSnapshot: () => Blob | null;
}

export function useVideoStream({
  camera,
  autoConnect = false,
  onFrame,
  onError,
}: UseVideoStreamOptions): UseVideoStreamResult {
  const [connectionState, setConnectionState] = useState<StreamConnectionState>('disconnected');
  const [frameUrl, setFrameUrl] = useState<string | null>(null);
  const [fps, setFps] = useState(0);
  const [frameCount, setFrameCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const frameCountRef = useRef(0);
  const lastFpsUpdateRef = useRef(Date.now());
  const frameUrlRef = useRef<string | null>(null);
  const lastFrameBlobRef = useRef<Blob | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  // ── Stable refs so connect/disconnect never change identity ──
  const cameraRef = useRef(camera);
  cameraRef.current = camera;

  const onFrameRef = useRef(onFrame);
  onFrameRef.current = onFrame;

  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  // Keep a ref to the connect function for reconnect callbacks
  const connectRef = useRef<() => Promise<void>>();

  // Take snapshot of current frame
  const takeSnapshot = useCallback((): Blob | null => {
    return lastFrameBlobRef.current;
  }, []);

  // Clean up frame URL on unmount
  useEffect(() => {
    return () => {
      if (frameUrlRef.current) {
        URL.revokeObjectURL(frameUrlRef.current);
      }
    };
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnect');
      wsRef.current = null;
    }

    reconnectAttemptsRef.current = 0;
    setConnectionState('disconnected');
  }, []);

  // connect is now fully stable — reads camera/callbacks from refs
  const connect = useCallback(async () => {
    // Disconnect existing connection
    disconnect();

    const cam = cameraRef.current;

    setConnectionState('connecting');
    setError(null);

    try {
      // First, start the stream via REST API
      await streamingApi.startStream({
        camera_id: cam.id,
        stream_url: cam.stream_url,
        config: {
          fps: cam.fps,
          quality: 85,
        },
      });

      // Then connect via WebSocket
      const wsUrl = streamingApi.getStreamWebSocketUrl(cam.id);
      const ws = new WebSocket(wsUrl);

      ws.binaryType = 'blob';

      ws.onopen = () => {
        console.log(`[useVideoStream] WS open for camera ${cam.id}`);
        setConnectionState('connected');
        setError(null);
        frameCountRef.current = 0;
        lastFpsUpdateRef.current = Date.now();
      };

      ws.onmessage = (event) => {
        if (event.data instanceof Blob) {
          // JPEG frame data
          const blob = event.data;
          lastFrameBlobRef.current = blob;

          // Revoke previous frame URL
          if (frameUrlRef.current) {
            URL.revokeObjectURL(frameUrlRef.current);
          }

          // Create new URL for the frame
          const url = URL.createObjectURL(blob);
          frameUrlRef.current = url;
          setFrameUrl(url);

          // Update frame count
          frameCountRef.current++;
          setFrameCount(frameCountRef.current);

          // Calculate FPS every second
          const now = Date.now();
          const elapsed = now - lastFpsUpdateRef.current;
          if (elapsed >= 1000) {
            setFps(Math.round((frameCountRef.current / elapsed) * 1000));
            frameCountRef.current = 0;
            lastFpsUpdateRef.current = now;
          }

          // Reset reconnect counter on successful frame
          reconnectAttemptsRef.current = 0;

          // Callback (read from ref for latest value)
          onFrameRef.current?.(blob);
        } else if (typeof event.data === 'string') {
          // Control message (ping/pong)
          if (event.data === 'ping') {
            ws.send('pong');
          }
        }
      };

      ws.onerror = (event) => {
        console.error('WebSocket error:', event);
        setError('Connection error');
        setConnectionState('error');
        onErrorRef.current?.(new Error('WebSocket connection error'));
      };

      ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        
        // Only attempt reconnect for abnormal closes
        if (event.code !== 1000 && event.code !== 1001) {
          reconnectAttemptsRef.current++;
          
          if (reconnectAttemptsRef.current < maxReconnectAttempts) {
            // Abnormal close, attempt reconnect with backoff
            setConnectionState('connecting');
            setError(`Reconnecting... (${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);
            
            const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current - 1), 10000);
            reconnectTimeoutRef.current = setTimeout(() => {
              if (wsRef.current === ws || wsRef.current === null) {
                connectRef.current?.();
              }
            }, delay);
          } else {
            setConnectionState('error');
            setError('Connection failed after multiple attempts');
          }
        } else {
          setConnectionState('disconnected');
        }
      };

      wsRef.current = ws;

    } catch (err) {
      console.error('Failed to start stream:', err);
      setError(err instanceof Error ? err.message : 'Failed to start stream');
      setConnectionState('error');
      onErrorRef.current?.(err instanceof Error ? err : new Error('Failed to start stream'));
    }
  }, [disconnect]);

  // Keep connectRef up to date
  connectRef.current = connect;

  // Auto-connect when camera.id changes (or on mount if autoConnect=true)
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  // camera.id is the only dep we care about — full `camera` object changes ref every render
  // eslint-disable-line
  }, [autoConnect, camera.id]);

  return {
    connectionState,
    frameUrl,
    fps,
    frameCount,
    connect,
    disconnect,
    isStreaming: connectionState === 'connected',
    error,
    takeSnapshot,
  };
}

export default useVideoStream;
