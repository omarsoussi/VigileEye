/**
 * useWebRTCStream – camera streaming hook.
 *
 * Primary: WebSocket binary JPEG frames: `ws://.../ws/stream/:cameraId?token=...`
 * Fallback: HTTP latest-frame polling:   `GET http://.../api/v1/streams/frame/:cameraId`
 *
 * Critical behavior:
 * - Uses the real stored token key: `vigileye-access-token` via tokenStorage.
 * - `isConnected` becomes true on WS open / HTTP OK.
 * - `hasFrames` becomes true only after a non-placeholder frame arrives.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { tokenStorage } from '../services/api';

export interface StreamState {
  isConnecting: boolean;
  isConnected: boolean;
  hasFrames: boolean;
  error: string | null;
  latency: number | null;
  mode: 'ws' | 'http' | 'none';
  frameUrl: string | null;
  fps: number;
  viewerCount: number;
  hasAudio: boolean;
  streamStatus: string;
  uptime: number;
}

interface UseWebRTCStreamProps {
  cameraId: string;
  authToken: string;
  autoConnect?: boolean;
}

const STREAMING_API_URL = process.env.REACT_APP_STREAMING_API_URL || 'http://localhost:8003';
const STREAMING_WS_URL = process.env.REACT_APP_STREAMING_WS_URL || 'ws://localhost:8003/ws';

const WS_OPEN_TIMEOUT_MS = 6000;
const FIRST_FRAME_TIMEOUT_MS = 6000;
const HTTP_POLL_MS = 200; // stable fallback; avoids hammering
const HTTP_MAX_ERRORS = 8;
const PLACEHOLDER_MAX_BYTES = 500;

const INITIAL_STATE: StreamState = {
  isConnecting: false,
  isConnected: false,
  hasFrames: false,
  error: null,
  latency: null,
  mode: 'none',
  frameUrl: null,
  fps: 0,
  viewerCount: 0,
  hasAudio: false,
  streamStatus: '',
  uptime: 0,
};

function resolveToken(passed: string): string {
  const trimmed = (passed || '').trim();
  if (trimmed) return trimmed;
  return tokenStorage.getAccessToken() || '';
}

export const useWebRTCStream = ({ cameraId, authToken, autoConnect = true }: UseWebRTCStreamProps) => {
  const [state, setState] = useState<StreamState>({ ...INITIAL_STATE });

  const videoRef = useRef<HTMLVideoElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const connIdRef = useRef(0);
  const mountedRef = useRef(true);
  const wsRef = useRef<WebSocket | null>(null);
  const httpTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const frameUrlRef = useRef<string | null>(null);
  const startTimeRef = useRef(0);

  const pendingFrameRef = useRef<Blob | null>(null);
  const rafRef = useRef<number | null>(null);

  const cleanup = useCallback(() => {
    if (wsRef.current) {
      const ws = wsRef.current;
      ws.onopen = null;
      ws.onclose = null;
      ws.onerror = null;
      ws.onmessage = null;
      try {
        if (ws.readyState <= WebSocket.OPEN) ws.close();
      } catch {
        // ignore
      }
      wsRef.current = null;
    }

    if (httpTimerRef.current) {
      clearInterval(httpTimerRef.current);
      httpTimerRef.current = null;
    }

    if (frameUrlRef.current) {
      URL.revokeObjectURL(frameUrlRef.current);
      frameUrlRef.current = null;
    }

    pendingFrameRef.current = null;
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const startHttpPolling = useCallback(
    (connId: number) => {
      if (httpTimerRef.current) return;

      const url = `${STREAMING_API_URL}/api/v1/streams/frame/${cameraId}`;
      let errors = 0;

      const tick = async () => {
        if (!mountedRef.current || connId !== connIdRef.current) {
          if (httpTimerRef.current) {
            clearInterval(httpTimerRef.current);
            httpTimerRef.current = null;
          }
          return;
        }

        const token = resolveToken(authToken);
        if (!token) {
          setState((p) => ({
            ...p,
            isConnecting: false,
            isConnected: false,
            hasFrames: false,
            error: 'Not authenticated',
            mode: 'none',
            frameUrl: null,
          }));
          return;
        }

        try {
          const res = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` },
            cache: 'no-store',
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);

          const blob = await res.blob();
          const isPlaceholder = blob.size > 0 && blob.size < PLACEHOLDER_MAX_BYTES;

          if (isPlaceholder) {
            errors = 0;
            setState((p) => ({
              ...p,
              isConnecting: false,
              isConnected: true,
              hasFrames: false,
              error: null,
              mode: 'http',
              streamStatus: 'no_signal',
              frameUrl: null,
            }));
            return;
          }

          const oldUrl = frameUrlRef.current;
          const newUrl = URL.createObjectURL(blob);
          frameUrlRef.current = newUrl;
          errors = 0;

          setState((p) => ({
            ...p,
            frameUrl: newUrl,
            isConnecting: false,
            isConnected: true,
            hasFrames: true,
            error: null,
            mode: 'http',
            latency: p.latency ?? Date.now() - startTimeRef.current,
          }));

          if (oldUrl) setTimeout(() => URL.revokeObjectURL(oldUrl), 200);
        } catch {
          errors++;
          if (errors >= HTTP_MAX_ERRORS && mountedRef.current && connId === connIdRef.current) {
            if (httpTimerRef.current) {
              clearInterval(httpTimerRef.current);
              httpTimerRef.current = null;
            }
            setState((p) => ({
              ...p,
              isConnecting: false,
              isConnected: false,
              hasFrames: false,
              error: 'Stream unavailable',
              mode: 'none',
              frameUrl: null,
            }));
          }
        }
      };

      tick();
      httpTimerRef.current = setInterval(tick, HTTP_POLL_MS);
    },
    [cameraId, authToken],
  );

  const connect = useCallback(() => {
    connIdRef.current++;
    const connId = connIdRef.current;

    cleanup();
    if (!mountedRef.current) return;

    const token = resolveToken(authToken);
    if (!token) {
      setState({
        ...INITIAL_STATE,
        error: 'Not authenticated',
      });
      return;
    }

    startTimeRef.current = Date.now();
    setState({
      ...INITIAL_STATE,
      isConnecting: true,
      mode: 'ws',
    });

    const wsUrl = `${STREAMING_WS_URL}/stream/${cameraId}?token=${encodeURIComponent(token)}`;

    let ws: WebSocket;
    try {
      ws = new WebSocket(wsUrl);
    } catch {
      startHttpPolling(connId);
      return;
    }

    wsRef.current = ws;
    ws.binaryType = 'arraybuffer';

    const openTimeout = setTimeout(() => {
      if (connId !== connIdRef.current) return;
      cleanup();
      startHttpPolling(connId);
    }, WS_OPEN_TIMEOUT_MS);

    const firstFrameTimeout = setTimeout(() => {
      if (connId !== connIdRef.current) return;
      // Connected transport, but no frames ever arrived
      try {
        ws.close();
      } catch {
        // ignore
      }
      startHttpPolling(connId);
    }, FIRST_FRAME_TIMEOUT_MS);

    let frameCount = 0;

    ws.onopen = () => {
      clearTimeout(openTimeout);
      if (connId !== connIdRef.current || !mountedRef.current) return;
      setState((p) => ({
        ...p,
        isConnecting: false,
        isConnected: true,
        hasFrames: false,
        error: null,
        mode: 'ws',
      }));
    };

    ws.onmessage = (ev: MessageEvent) => {
      if (connId !== connIdRef.current || !mountedRef.current) return;

      if (typeof ev.data === 'string') {
        try {
          const msg = JSON.parse(ev.data);
          if (msg.type === 'status') {
            setState((p) => ({
              ...p,
              isConnecting: false,
              isConnected: true,
              fps: typeof msg.fps === 'number' ? Math.round(msg.fps * 10) / 10 : p.fps,
              viewerCount: typeof msg.viewer_count === 'number' ? msg.viewer_count : p.viewerCount,
              hasAudio: typeof msg.has_audio === 'boolean' ? msg.has_audio : p.hasAudio,
              streamStatus: typeof msg.status === 'string' ? msg.status : p.streamStatus,
              uptime: typeof msg.uptime === 'number' ? msg.uptime : p.uptime,
            }));
          } else if (msg.type === 'error') {
            setState((p) => ({ ...p, error: msg.message || 'Stream error' }));
          }
        } catch {
          // ignore
        }
        return;
      }

      // Binary JPEG frame
      const blob = new Blob([ev.data], { type: 'image/jpeg' });
      if (blob.size < 200) return;

      // Drop-frame strategy: keep only the most recent frame and render
      // at the browser's paint rate to avoid UI backlog/latency.
      pendingFrameRef.current = blob;
      if (rafRef.current !== null) return;

      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        if (connId !== connIdRef.current || !mountedRef.current) return;

        const latest = pendingFrameRef.current;
        pendingFrameRef.current = null;
        if (!latest || latest.size < 200) return;

        clearTimeout(firstFrameTimeout);

        const oldUrl = frameUrlRef.current;
        const newUrl = URL.createObjectURL(latest);
        frameUrlRef.current = newUrl;
        frameCount++;

        setState((p) => ({
          ...p,
          frameUrl: newUrl,
          isConnecting: false,
          isConnected: true,
          hasFrames: true,
          error: null,
          mode: 'ws',
          latency: frameCount === 1 ? Date.now() - startTimeRef.current : p.latency,
        }));

        if (oldUrl) setTimeout(() => URL.revokeObjectURL(oldUrl), 200);
      });
    };

    ws.onclose = () => {
      clearTimeout(openTimeout);
      clearTimeout(firstFrameTimeout);
      if (connId !== connIdRef.current) return;
      wsRef.current = null;
      startHttpPolling(connId);
    };

    ws.onerror = () => {
      clearTimeout(openTimeout);
      // onclose will handle fallback
    };
  }, [authToken, cameraId, cleanup, startHttpPolling]);

  const disconnect = useCallback(() => {
    connIdRef.current++;
    cleanup();
    setState({ ...INITIAL_STATE });
  }, [cleanup]);

  useEffect(() => {
    mountedRef.current = true;

    const token = resolveToken(authToken);
    if (autoConnect && cameraId && token) {
      const delay = 50 + Math.random() * 250;
      const t = setTimeout(() => {
        if (mountedRef.current) connect();
      }, delay);

      return () => {
        clearTimeout(t);
        mountedRef.current = false;
        cleanup();
      };
    }

    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, [authToken, autoConnect, cameraId, cleanup, connect]);

  return { videoRef, imgRef, state, connect, disconnect };
};
