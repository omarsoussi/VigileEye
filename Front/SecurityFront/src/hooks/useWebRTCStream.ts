/**
 * useWebRTCStream – camera streaming hook using real WebRTC.
 *
 * Primary:  WebRTC PeerConnection with HTTP-based SDP signaling (no WebSocket).
 *           POST /api/v1/webrtc/offer  → SDP answer
 *           POST /api/v1/webrtc/ice-candidate → trickle ICE
 * Fallback: HTTP latest-frame polling: GET /api/v1/streams/frame/:cameraId
 *
 * The Go StreamingBackend sends H.264 via pion/webrtc TrackLocalStaticRTP.
 * The browser renders the MediaStream on a <video> element (videoRef).
 * For components still using <img> (e.g. LiveThumbnail), frameUrl provides
 * HTTP-polled JPEG snapshots as a compatible fallback.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { streamingApi, tokenStorage } from '../services/api';

export interface StreamState {
  isConnecting: boolean;
  isConnected: boolean;
  hasFrames: boolean;
  error: string | null;
  latency: number | null;
  mode: 'webrtc' | 'http' | 'none';
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
  /** Optional camera stream URL to proactively start the stream (faster first load) */
  streamUrl?: string;
}


const WEBRTC_CONNECT_TIMEOUT_MS = 20000;
const HTTP_POLL_MS = 100;
const HTTP_MAX_ERRORS = 8;
const PLACEHOLDER_MAX_BYTES = 2048;
const STATS_POLL_MS = 5000;

const PLACEHOLDER_HEADER = 'X-VigileEye-Placeholder';

const OFFER_RETRY_TOTAL_MS = 20000;
const OFFER_RETRY_DELAY_MS = 500;

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

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

export const useWebRTCStream = ({ cameraId, authToken, autoConnect = true, streamUrl }: UseWebRTCStreamProps) => {
  const [state, setState] = useState<StreamState>({ ...INITIAL_STATE });

  const videoRef = useRef<HTMLVideoElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const connIdRef = useRef(0);
  const mountedRef = useRef(true);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const viewerIdRef = useRef<string | null>(null);
  const httpTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const statsTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const frameUrlRef = useRef<string | null>(null);
  const startTimeRef = useRef(0);

  const ensureStreamStarted = useCallback(async () => {
    if (!streamUrl) return;
    try {
      const status = await streamingApi.getStreamStatus(cameraId);
      if (status?.is_streaming) return;
    } catch {
      // ignore
    }
    try {
      await streamingApi.startStream({ camera_id: cameraId, stream_url: streamUrl });
    } catch {
      // ignore
    }
  }, [cameraId, streamUrl]);

  // ─── Cleanup ───

  const cleanup = useCallback(() => {
    // Close WebRTC peer connection
    if (pcRef.current) {
      try {
        pcRef.current.close();
      } catch {
        // ignore
      }
      pcRef.current = null;
    }

    // Notify backend of disconnect
    if (viewerIdRef.current && cameraId) {
      streamingApi.webrtcDisconnect(cameraId, viewerIdRef.current).catch(() => {});
      viewerIdRef.current = null;
    }

    // Stop HTTP polling
    if (httpTimerRef.current) {
      clearInterval(httpTimerRef.current);
      httpTimerRef.current = null;
    }

    // Stop stats polling
    if (statsTimerRef.current) {
      clearInterval(statsTimerRef.current);
      statsTimerRef.current = null;
    }

    // Revoke object URL
    if (frameUrlRef.current) {
      URL.revokeObjectURL(frameUrlRef.current);
      frameUrlRef.current = null;
    }
  }, [cameraId]);

  // ─── HTTP Frame Polling Fallback (for thumbnails / no WebRTC support) ───

  const startHttpPolling = useCallback(
    (connId: number) => {
      if (httpTimerRef.current) return;

      let url: string;
      try {
        url = streamingApi.getFrameUrl(cameraId);
      } catch (e: any) {
        setState((p) => ({
          ...p,
          isConnecting: false,
          isConnected: false,
          hasFrames: false,
          mode: 'none',
          frameUrl: null,
          error: String(e?.message || 'Streaming backend is not configured'),
        }));
        return;
      }
      let errors = 0;
      let inFlight = false;

      const tick = async () => {
        if (!mountedRef.current || connId !== connIdRef.current) {
          if (httpTimerRef.current) {
            clearInterval(httpTimerRef.current);
            httpTimerRef.current = null;
          }
          return;
        }

        if (inFlight) return;
        inFlight = true;

        try {
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

          const res = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` },
            cache: 'no-store',
          });

          // During startup, the backend can legitimately return 404 until FFmpeg produces the first frame.
          // Treat that as "warming up" instead of an error.
          if (res.status === 404) {
            errors = 0;
            setState((p) => ({
              ...p,
              isConnecting: false,
              isConnected: true,
              hasFrames: false,
              error: null,
              mode: 'http',
              streamStatus: p.streamStatus || 'connecting',
              frameUrl: null,
            }));
            return;
          }

          if (!res.ok) throw new Error(`HTTP ${res.status}`);

          const isHeaderPlaceholder = res.headers.get(PLACEHOLDER_HEADER) === '1';

          const blob = await res.blob();
          const isSizePlaceholder = blob.size > 0 && blob.size < PLACEHOLDER_MAX_BYTES;
          const isPlaceholder = isHeaderPlaceholder || isSizePlaceholder;

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
        } finally {
          inFlight = false;
        }
      };

      tick();
      httpTimerRef.current = setInterval(tick, HTTP_POLL_MS);
    },
    [cameraId, authToken],
  );

  // ─── Stats Polling ───

  const startStatsPolling = useCallback(
    (connId: number) => {
      if (statsTimerRef.current) return;

      const tick = async () => {
        if (!mountedRef.current || connId !== connIdRef.current) {
          if (statsTimerRef.current) {
            clearInterval(statsTimerRef.current);
            statsTimerRef.current = null;
          }
          return;
        }

        try {
          const info = await streamingApi.getRealTimeInfo(cameraId);
          if (mountedRef.current && connId === connIdRef.current) {
            setState((p) => ({
              ...p,
              fps: info.current_fps || p.fps,
              viewerCount: info.viewer_count ?? p.viewerCount,
              hasAudio: info.has_audio ?? p.hasAudio,
              streamStatus: info.status || p.streamStatus,
              uptime: info.uptime ?? p.uptime,
            }));
          }
        } catch {
          // Stats polling failure is non-critical
        }
      };

      tick();
      statsTimerRef.current = setInterval(tick, STATS_POLL_MS);
    },
    [cameraId],
  );

  // ─── WebRTC Connect ───

  const connect = useCallback(async () => {
    connIdRef.current++;
    const connId = connIdRef.current;

    cleanup();
    if (!mountedRef.current) return;

    const token = resolveToken(authToken);
    if (!token) {
      setState({ ...INITIAL_STATE, error: 'Not authenticated' });
      return;
    }

    startTimeRef.current = Date.now();
    setState({ ...INITIAL_STATE, isConnecting: true, mode: 'webrtc' });

    // Best-effort: start the stream first to reduce offer 503s during cold start.
    await ensureStreamStarted();

    try {
      // 1. Fetch ICE servers from backend
      let iceServers: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }];
      try {
        const iceResp = await streamingApi.getICEServers();
        if (iceResp.ice_servers?.length) {
          iceServers = iceResp.ice_servers.map((s) => ({
            urls: s.urls,
            username: s.username || undefined,
            credential: s.credential || undefined,
          }));
        }
      } catch {
        // Use default STUN
      }

      if (connId !== connIdRef.current || !mountedRef.current) return;

      // 2. Create PeerConnection
      const pc = new RTCPeerConnection({ iceServers });
      pcRef.current = pc;

      // Add transceiver for receiving video
      pc.addTransceiver('video', { direction: 'recvonly' });

      // Add transceiver for receiving audio (if available)
      pc.addTransceiver('audio', { direction: 'recvonly' });

      // Handle incoming tracks → attach to <video>
      pc.ontrack = (ev) => {
        if (connId !== connIdRef.current || !mountedRef.current) return;

        const stream = ev.streams[0] || new MediaStream([ev.track]);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }

        setState((p) => ({
          ...p,
          isConnecting: false,
          isConnected: true,
          hasFrames: true,
          error: null,
          mode: 'webrtc',
          latency: Date.now() - startTimeRef.current,
        }));

        // Start stats polling
        startStatsPolling(connId);
      };

      pc.oniceconnectionstatechange = () => {
        if (connId !== connIdRef.current) return;
        const iceState = pc.iceConnectionState;

        if (iceState === 'connected' || iceState === 'completed') {
          setState((p) => ({
            ...p,
            isConnecting: false,
            isConnected: true,
            error: null,
          }));
        } else if (iceState === 'failed' || iceState === 'disconnected') {
          // Fallback to HTTP polling
          cleanup();
          startHttpPolling(connId);
        } else if (iceState === 'closed') {
          setState((p) => ({
            ...p,
            isConnected: false,
            hasFrames: false,
            mode: 'none',
          }));
        }
      };

      // 3. Create SDP offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // 4. Wait for ICE gathering to complete (or timeout)
      await new Promise<void>((resolve) => {
        if (pc.iceGatheringState === 'complete') {
          resolve();
          return;
        }
        const checkState = () => {
          if (pc.iceGatheringState === 'complete') {
            pc.removeEventListener('icegatheringstatechange', checkState);
            resolve();
          }
        };
        pc.addEventListener('icegatheringstatechange', checkState);
        // Fallback timeout — don't wait forever
        setTimeout(resolve, 3000);
      });

      if (connId !== connIdRef.current || !mountedRef.current) return;

      // 5. Send offer to backend, get answer
      const localDesc = pc.localDescription;
      if (!localDesc) throw new Error('No local description');

      const startRetry = Date.now();
      let answerResp: any = null;
      // Retry a bit when the backend says the MediaMTX stream isn't ready yet.
      // This avoids immediately falling back to low-FPS HTTP polling during startup.
      // Note: streamingApi throws an ApiError-like object { message, error_code }.
      // eslint-disable-next-line no-constant-condition
      while (true) {
        try {
          answerResp = await streamingApi.webrtcOffer({
            camera_id: cameraId,
            sdp: localDesc.sdp,
            type: localDesc.type,
          });
          break;
        } catch (e) {
          if (connId !== connIdRef.current || !mountedRef.current) return;

          const msg = String(e?.message || '');
          const code = String(e?.error_code || '');
          const retryable = code === 'STREAM_CONNECTION_ERROR' && msg.toLowerCase().includes('not ready');
          if (!retryable || Date.now() - startRetry > OFFER_RETRY_TOTAL_MS) {
            throw e;
          }
          await sleep(OFFER_RETRY_DELAY_MS);
        }
      }

      if (connId !== connIdRef.current || !mountedRef.current) return;

      viewerIdRef.current = answerResp.viewer_id;

      // 6. Set remote SDP answer
      await pc.setRemoteDescription({
        type: answerResp.type as RTCSdpType,
        sdp: answerResp.sdp,
      });

      // 7. Connection timeout — if no track arrives, fallback
      setTimeout(() => {
        if (connId !== connIdRef.current || !mountedRef.current) return;
        setState((prev) => {
          if (!prev.hasFrames && prev.mode === 'webrtc') {
            cleanup();
            startHttpPolling(connId);
            return { ...prev, mode: 'http', isConnecting: true };
          }
          return prev;
        });
      }, WEBRTC_CONNECT_TIMEOUT_MS);

    } catch (err) {
      if (connId !== connIdRef.current || !mountedRef.current) return;

      console.warn('[useWebRTCStream] WebRTC failed, falling back to HTTP polling:', err);
      cleanup();
      startHttpPolling(connId);
    }
  }, [authToken, cameraId, cleanup, ensureStreamStarted, startHttpPolling, startStatsPolling]);

  // ─── Disconnect ───

  const disconnect = useCallback(() => {
    connIdRef.current++;
    cleanup();
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setState({ ...INITIAL_STATE });
  }, [cleanup]);

  // ─── Auto-connect lifecycle ───

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
