/**
 * useWHEPStream – camera streaming hook using WHEP (WebRTC-HTTP Egress Protocol).
 *
 * When MediaMTX is enabled, the backend provides a whep_endpoint in the stream
 * status response. The browser sends an SDP offer directly to MediaMTX's WHEP
 * endpoint and receives the SDP answer. No custom signaling server needed.
 *
 * WHEP flow:
 *  1. Start stream via backend (POST /api/v1/streams/start)
 *  2. Get stream status → whep_endpoint (e.g. http://localhost:8889/<cameraId>/whep)
 *  3. Create RTCPeerConnection + SDP offer
 *  4. POST offer to WHEP endpoint → SDP answer + Location header (session URL)
 *  5. Set remote description → media flows
 *  6. To disconnect: DELETE session URL
 *
 * Fallback: if WHEP fails, falls back to backend-proxied WebRTC or HTTP polling.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { streamingApi, tokenStorage } from '../services/api';

const MEDIAMTX_WHEP_URL = process.env.REACT_APP_MEDIAMTX_WHEP_URL || 'http://localhost:8889';
const STREAMING_API_URL = process.env.REACT_APP_STREAMING_API_URL || 'http://localhost:8003';

const WHEP_CONNECT_TIMEOUT_MS = 10000;
const HTTP_POLL_MS = 200;
const HTTP_MAX_ERRORS = 8;
const PLACEHOLDER_MAX_BYTES = 500;
const STATS_POLL_MS = 5000;

export interface WHEPStreamState {
  isConnecting: boolean;
  isConnected: boolean;
  hasFrames: boolean;
  error: string | null;
  latency: number | null;
  mode: 'whep' | 'webrtc' | 'http' | 'none';
  frameUrl: string | null;
  fps: number;
  viewerCount: number;
  hasAudio: boolean;
  streamStatus: string;
  uptime: number;
}

interface UseWHEPStreamProps {
  cameraId: string;
  authToken: string;
  autoConnect?: boolean;
  /** Override the WHEP base URL (for testing or custom deployments) */
  whepBaseUrl?: string;
}

const INITIAL_STATE: WHEPStreamState = {
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

export const useWHEPStream = ({
  cameraId,
  authToken,
  autoConnect = true,
  whepBaseUrl,
}: UseWHEPStreamProps) => {
  const [state, setState] = useState<WHEPStreamState>({ ...INITIAL_STATE });

  const videoRef = useRef<HTMLVideoElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const connIdRef = useRef(0);
  const mountedRef = useRef(true);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const whepSessionRef = useRef<string | null>(null);
  const httpTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const statsTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const frameUrlRef = useRef<string | null>(null);
  const startTimeRef = useRef(0);

  const whepBase = whepBaseUrl || MEDIAMTX_WHEP_URL;

  // ─── Cleanup ───

  const cleanup = useCallback(() => {
    // Close WebRTC peer connection
    if (pcRef.current) {
      try { pcRef.current.close(); } catch { /* ignore */ }
      pcRef.current = null;
    }

    // Delete WHEP session
    if (whepSessionRef.current) {
      const sessionUrl = whepSessionRef.current;
      fetch(sessionUrl, { method: 'DELETE' }).catch(() => {});
      whepSessionRef.current = null;
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
  }, []);

  // ─── HTTP Frame Polling Fallback ───

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
          setState((p) => ({ ...p, isConnecting: false, isConnected: false, error: 'Not authenticated', mode: 'none' }));
          return;
        }

        try {
          const res = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` },
            cache: 'no-store',
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);

          const blob = await res.blob();
          if (blob.size > 0 && blob.size < PLACEHOLDER_MAX_BYTES) {
            errors = 0;
            setState((p) => ({ ...p, isConnecting: false, isConnected: true, hasFrames: false, error: null, mode: 'http', streamStatus: 'no_signal' }));
            return;
          }

          const oldUrl = frameUrlRef.current;
          const newUrl = URL.createObjectURL(blob);
          frameUrlRef.current = newUrl;
          errors = 0;

          setState((p) => ({
            ...p, frameUrl: newUrl, isConnecting: false, isConnected: true,
            hasFrames: true, error: null, mode: 'http',
            latency: p.latency ?? Date.now() - startTimeRef.current,
          }));

          if (oldUrl) setTimeout(() => URL.revokeObjectURL(oldUrl), 200);
        } catch {
          errors++;
          if (errors >= HTTP_MAX_ERRORS && mountedRef.current && connId === connIdRef.current) {
            if (httpTimerRef.current) { clearInterval(httpTimerRef.current); httpTimerRef.current = null; }
            setState((p) => ({ ...p, isConnecting: false, isConnected: false, hasFrames: false, error: 'Stream unavailable', mode: 'none', frameUrl: null }));
          }
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
          if (statsTimerRef.current) { clearInterval(statsTimerRef.current); statsTimerRef.current = null; }
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
        } catch { /* non-critical */ }
      };

      tick();
      statsTimerRef.current = setInterval(tick, STATS_POLL_MS);
    },
    [cameraId],
  );

  // ─── WHEP Connect ───

  const connectWHEP = useCallback(async (connId: number): Promise<boolean> => {
    try {
      const whepUrl = `${whepBase}/${cameraId}/whep`;

      // Create PeerConnection (STUN only for WHEP — MediaMTX handles the rest)
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });
      pcRef.current = pc;

      // Receive-only video + audio
      pc.addTransceiver('video', { direction: 'recvonly' });
      pc.addTransceiver('audio', { direction: 'recvonly' });

      // Handle incoming tracks
      pc.ontrack = (ev) => {
        if (connId !== connIdRef.current || !mountedRef.current) return;

        const stream = ev.streams[0] || new MediaStream([ev.track]);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }

        setState((p) => ({
          ...p, isConnecting: false, isConnected: true, hasFrames: true,
          error: null, mode: 'whep',
          latency: Date.now() - startTimeRef.current,
          hasAudio: stream.getAudioTracks().length > 0,
        }));

        startStatsPolling(connId);
      };

      pc.oniceconnectionstatechange = () => {
        if (connId !== connIdRef.current) return;
        const iceState = pc.iceConnectionState;

        if (iceState === 'connected' || iceState === 'completed') {
          setState((p) => ({ ...p, isConnecting: false, isConnected: true, error: null }));
        } else if (iceState === 'failed' || iceState === 'disconnected') {
          cleanup();
          startHttpPolling(connId);
        }
      };

      // Create SDP offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Wait for ICE gathering (short timeout)
      await new Promise<void>((resolve) => {
        if (pc.iceGatheringState === 'complete') { resolve(); return; }
        const check = () => {
          if (pc.iceGatheringState === 'complete') {
            pc.removeEventListener('icegatheringstatechange', check);
            resolve();
          }
        };
        pc.addEventListener('icegatheringstatechange', check);
        setTimeout(resolve, 2000);
      });

      if (connId !== connIdRef.current || !mountedRef.current) return false;

      const localDesc = pc.localDescription;
      if (!localDesc) throw new Error('No local description');

      // Send SDP offer to WHEP endpoint
      const resp = await fetch(whepUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/sdp' },
        body: localDesc.sdp,
      });

      if (!resp.ok) {
        const body = await resp.text();
        throw new Error(`WHEP ${resp.status}: ${body}`);
      }

      const answerSdp = await resp.text();

      // Store session URL from Location header (for ICE candidates & teardown)
      const sessionLocation = resp.headers.get('Location');
      if (sessionLocation) {
        // Resolve relative URLs against the WHEP endpoint URL.
        // MediaMTX can return a relative Location (e.g. "whep/<uuid>" or "<uuid>").
        // Resolving against the origin (whepBase) can produce invalid URLs like
        // http://host:8889/<uuid> which then 404.
        try {
          whepSessionRef.current = new URL(sessionLocation, whepUrl).toString();
        } catch {
          // Fallback: best-effort absolute path on the WHEP origin
          whepSessionRef.current = sessionLocation.startsWith('http')
            ? sessionLocation
            : new URL(sessionLocation, whepBase).toString();
        }
      }

      if (connId !== connIdRef.current || !mountedRef.current) return false;

      // Set remote SDP answer
      await pc.setRemoteDescription({
        type: 'answer',
        sdp: answerSdp,
      });

      // Timeout: if no track arrives, fall back
      setTimeout(() => {
        if (connId !== connIdRef.current || !mountedRef.current) return;
        setState((prev) => {
          if (!prev.hasFrames && prev.mode === 'whep') {
            cleanup();
            startHttpPolling(connId);
            return { ...prev, mode: 'http', isConnecting: true };
          }
          return prev;
        });
      }, WHEP_CONNECT_TIMEOUT_MS);

      return true;
    } catch (err) {
      console.warn('[useWHEPStream] WHEP failed:', err);
      return false;
    }
  }, [whepBase, cameraId, cleanup, startHttpPolling, startStatsPolling]);

  // ─── Fallback: Backend-Proxied WebRTC ───

  const connectViaBackend = useCallback(async (connId: number): Promise<boolean> => {
    try {
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
      } catch { /* use defaults */ }

      if (connId !== connIdRef.current || !mountedRef.current) return false;

      const pc = new RTCPeerConnection({ iceServers });
      pcRef.current = pc;

      pc.addTransceiver('video', { direction: 'recvonly' });

      pc.ontrack = (ev) => {
        if (connId !== connIdRef.current || !mountedRef.current) return;
        const stream = ev.streams[0] || new MediaStream([ev.track]);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
        setState((p) => ({
          ...p, isConnecting: false, isConnected: true, hasFrames: true,
          error: null, mode: 'webrtc',
          latency: Date.now() - startTimeRef.current,
        }));
        startStatsPolling(connId);
      };

      pc.oniceconnectionstatechange = () => {
        if (connId !== connIdRef.current) return;
        const iceState = pc.iceConnectionState;
        if (iceState === 'failed' || iceState === 'disconnected') {
          cleanup();
          startHttpPolling(connId);
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      await new Promise<void>((resolve) => {
        if (pc.iceGatheringState === 'complete') { resolve(); return; }
        const check = () => {
          if (pc.iceGatheringState === 'complete') {
            pc.removeEventListener('icegatheringstatechange', check);
            resolve();
          }
        };
        pc.addEventListener('icegatheringstatechange', check);
        setTimeout(resolve, 3000);
      });

      if (connId !== connIdRef.current || !mountedRef.current) return false;

      const localDesc = pc.localDescription;
      if (!localDesc) throw new Error('No local description');

      const answerResp = await streamingApi.webrtcOffer({
        camera_id: cameraId,
        sdp: localDesc.sdp,
        type: localDesc.type,
      });

      if (connId !== connIdRef.current || !mountedRef.current) return false;

      await pc.setRemoteDescription({
        type: answerResp.type as RTCSdpType,
        sdp: answerResp.sdp,
      });

      return true;
    } catch (err) {
      console.warn('[useWHEPStream] Backend WebRTC failed:', err);
      return false;
    }
  }, [cameraId, cleanup, startHttpPolling, startStatsPolling]);

  // ─── Main Connect: WHEP → Backend WebRTC → HTTP Polling ───

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
    setState({ ...INITIAL_STATE, isConnecting: true, mode: 'whep' });

    // Try WHEP first (direct to MediaMTX)
    const whepOk = await connectWHEP(connId);
    if (whepOk) return;

    if (connId !== connIdRef.current || !mountedRef.current) return;

    // Fallback: try backend-proxied WebRTC
    setState((p) => ({ ...p, mode: 'webrtc' }));
    const backendOk = await connectViaBackend(connId);
    if (backendOk) return;

    if (connId !== connIdRef.current || !mountedRef.current) return;

    // Last resort: HTTP polling
    startHttpPolling(connId);
  }, [authToken, cleanup, connectWHEP, connectViaBackend, startHttpPolling]);

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
