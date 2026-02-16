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

  const connect = useCallback(async () => {
    // Disconnect existing connection
    disconnect();

    setConnectionState('connecting');
    setError(null);

    try {
      // First, start the stream via REST API
      await streamingApi.startStream({
        camera_id: camera.id,
        stream_url: camera.stream_url,
        config: {
          fps: camera.fps,
          quality: 85,
        },
      });

      // Then connect via WebSocket
      const wsUrl = streamingApi.getStreamWebSocketUrl(camera.id);
      const ws = new WebSocket(wsUrl);

      ws.binaryType = 'blob';

      ws.onopen = () => {
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

          // Callback
          if (onFrame) {
            onFrame(blob);
          }
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
        if (onError) {
          onError(new Error('WebSocket connection error'));
        }
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
                connect();
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
      if (onError) {
        onError(err instanceof Error ? err : new Error('Failed to start stream'));
      }
    }
  }, [camera, disconnect, onFrame, onError]);

  // Auto-connect on mount if enabled
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

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
