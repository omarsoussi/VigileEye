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

const WHEP_CONNECT_TIMEOUT_MS = 5000;
const HTTP_POLL_MS = 100;
const HTTP_MAX_ERRORS = 8;
const PLACEHOLDER_MAX_BYTES = 2048;
const STATS_POLL_MS = 5000;

const PLACEHOLDER_HEADER = 'X-VigileEye-Placeholder';

const OFFER_RETRY_TOTAL_MS = 8000;
const OFFER_RETRY_DELAY_MS = 300;

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

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
  /** Optional camera stream URL to proactively start the stream (faster first load) */
  streamUrl?: string;
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
  streamUrl,
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

  const resolveWHEPEndpoint = useCallback(async (): Promise<string | null> => {
    try {
      const status = await streamingApi.getStreamStatus(cameraId);
      const endpoint = (status?.whep_endpoint || '').trim();
      if (endpoint) return endpoint;
      // Stream exists but no whep_endpoint → fall back to constructed URL
      return `${whepBase}/${cameraId}/whep`;
    } catch {
      // If we can't fetch status, fall back to constructed URL.
      return `${whepBase}/${cameraId}/whep`;
    }
  }, [cameraId, whepBase]);

  // Combined: ensure stream started + resolve WHEP in one step
  const ensureStreamAndResolveWHEP = useCallback(async (): Promise<string | null> => {
    let whepEndpoint: string | null = null;

    // First try to get status (tells us if stream is running + WHEP endpoint)
    try {
      const status = await streamingApi.getStreamStatus(cameraId);
      const endpoint = (status?.whep_endpoint || '').trim();
      whepEndpoint = endpoint || `${whepBase}/${cameraId}/whep`;

      if (status?.is_streaming) return whepEndpoint;
    } catch {
      whepEndpoint = `${whepBase}/${cameraId}/whep`;
    }

    // Stream not started → start it
    if (streamUrl) {
      try {
        await streamingApi.startStream({ camera_id: cameraId, stream_url: streamUrl });
      } catch { /* ignore – might already be started */ }
    }
    return whepEndpoint;
  }, [cameraId, streamUrl, whepBase]);

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
            setState((p) => ({ ...p, isConnecting: false, isConnected: true, hasFrames: false, error: null, mode: 'http', streamStatus: p.streamStatus || 'connecting' }));
            return;
          }

          if (!res.ok) throw new Error(`HTTP ${res.status}`);

          const isHeaderPlaceholder = res.headers.get(PLACEHOLDER_HEADER) === '1';
          const blob = await res.blob();
          const isSizePlaceholder = blob.size > 0 && blob.size < PLACEHOLDER_MAX_BYTES;
          if (isHeaderPlaceholder || isSizePlaceholder) {
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
        } finally {
          inFlight = false;
        }
      };

      console.log(`[VigileEye HTTP] Camera ${cameraId}: HTTP JPEG polling started (interval=${HTTP_POLL_MS}ms, url=${url})`);
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

  const connectWHEP = useCallback(async (connId: number, whepUrl: string): Promise<boolean> => {
    try {
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
        console.log(`[VigileEye WHEP] Camera ${cameraId}: Track received — kind=${ev.track.kind}, readyState=${ev.track.readyState}, videoTracks=${stream.getVideoTracks().length}, audioTracks=${stream.getAudioTracks().length}`);
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
        console.log(`[VigileEye WHEP] Camera ${cameraId}: ICE state → ${iceState}`);

        if (iceState === 'connected' || iceState === 'completed') {
          console.log(`[VigileEye WHEP] Camera ${cameraId}: ICE connected — WebRTC media flowing`);
          setState((p) => ({ ...p, isConnecting: false, isConnected: true, error: null }));
        } else if (iceState === 'failed' || iceState === 'disconnected') {
          console.warn(`[VigileEye WHEP] Camera ${cameraId}: ICE ${iceState} — falling back to HTTP polling`);
          cleanup();
          startHttpPolling(connId);
        }
      };

      // Create SDP offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Wait for ICE gathering (short timeout — local candidates only, no relay)
      await new Promise<void>((resolve) => {
        if (pc.iceGatheringState === 'complete') { resolve(); return; }
        const check = () => {
          if (pc.iceGatheringState === 'complete') {
            pc.removeEventListener('icegatheringstatechange', check);
            resolve();
          }
        };
        pc.addEventListener('icegatheringstatechange', check);
        setTimeout(resolve, 800);
      });

      if (connId !== connIdRef.current || !mountedRef.current) return false;

      const localDesc = pc.localDescription;
      if (!localDesc) throw new Error('No local description');

      // Send SDP offer to WHEP endpoint (retry briefly on 404 "no stream" during startup)
      console.log(`[VigileEye WHEP] Camera ${cameraId}: Sending SDP offer to ${whepUrl}`);
      const whepStart = Date.now();
      let resp: Response | null = null;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        resp = await fetch(whepUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/sdp' },
          body: localDesc.sdp,
        });

        if (resp.ok) break;

        const body = await resp.text().catch(() => '');
        const retryable = resp.status === 404 && body.toLowerCase().includes('no stream');
        if (!retryable || Date.now() - whepStart > OFFER_RETRY_TOTAL_MS) {
          throw new Error(`WHEP ${resp.status}: ${body}`);
        }
        await sleep(OFFER_RETRY_DELAY_MS);
      }

      if (!resp) throw new Error('WHEP request failed');

      const answerSdp = await resp.text();

      console.log(`[VigileEye WHEP] Camera ${cameraId}: SDP answer received (${answerSdp.length} bytes)`);

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
  }, [cleanup, startHttpPolling, startStatsPolling]);

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

      pc.addTransceiver('audio', { direction: 'recvonly' });

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
        setTimeout(resolve, 1000);
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
    setState({ ...INITIAL_STATE, isConnecting: true, mode: 'none' });

    console.log(`[VigileEye Streaming] Camera ${cameraId}: Starting connection sequence...`);
    console.log(`[VigileEye Streaming] Camera ${cameraId}: WHEP base URL = ${whepBase}`);
    if (streamUrl) console.log(`[VigileEye Streaming] Camera ${cameraId}: Stream URL = ${streamUrl}`);

    // Combined: ensure stream is started and resolve WHEP endpoint in one pass (saves an API round-trip).
    const whepEndpoint = await ensureStreamAndResolveWHEP();

    if (whepEndpoint) {
      console.log(`[VigileEye Streaming] Camera ${cameraId}: Attempting WHEP connection → ${whepEndpoint}`);
      setState((p) => ({ ...p, mode: 'whep' }));
      const whepOk = await connectWHEP(connId, whepEndpoint);
      if (whepOk) {
        console.log(`[VigileEye Streaming] Camera ${cameraId}: WHEP connected successfully (sub-second latency)`);
        return;
      }
      console.warn(`[VigileEye Streaming] Camera ${cameraId}: WHEP failed, trying backend WebRTC...`);
    }

    if (connId !== connIdRef.current || !mountedRef.current) return;

    // Fallback: try backend-proxied WebRTC
    console.log(`[VigileEye Streaming] Camera ${cameraId}: Attempting backend-proxied WebRTC...`);
    setState((p) => ({ ...p, mode: 'webrtc' }));
    const backendOk = await connectViaBackend(connId);
    if (backendOk) {
      console.log(`[VigileEye Streaming] Camera ${cameraId}: Backend WebRTC connected`);
      return;
    }
    console.warn(`[VigileEye Streaming] Camera ${cameraId}: Backend WebRTC failed, falling back to HTTP polling (HIGH LATENCY)`);

    if (connId !== connIdRef.current || !mountedRef.current) return;

    // Last resort: HTTP polling
    console.warn(`[VigileEye Streaming] Camera ${cameraId}: Using HTTP JPEG polling — expect slideshow-like performance`);
    startHttpPolling(connId);
  }, [authToken, cleanup, connectWHEP, connectViaBackend, ensureStreamAndResolveWHEP, startHttpPolling]);

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
      // Minimal jitter to avoid thundering herd, but connect fast
      const delay = 10 + Math.random() * 50;
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
