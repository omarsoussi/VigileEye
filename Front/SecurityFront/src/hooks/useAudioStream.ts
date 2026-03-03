/**
 * Custom hook for streaming audio from a camera via WebSocket.
 *
 * Uses the Web Audio API to play raw PCM float32 audio received
 * as binary WebSocket messages from /ws/audio/{camera_id}.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { CameraResponse, tokenStorage } from '../services/api';

const STREAMING_WS_BASE_URL =
  process.env.REACT_APP_STREAMING_WS_URL || 'ws://localhost:8003/ws';

export interface UseAudioStreamOptions {
  camera: CameraResponse;
  autoConnect?: boolean;
}

export interface UseAudioStreamResult {
  /** Whether audio is currently playing */
  isPlaying: boolean;
  /** Whether the audio stream is available for this camera */
  isAvailable: boolean;
  /** Volume from 0 to 1 */
  volume: number;
  /** Whether audio is muted */
  isMuted: boolean;
  /** Error message if any */
  error: string | null;
  /** Connect and start playing audio */
  connect: () => void;
  /** Disconnect audio */
  disconnect: () => void;
  /** Set volume (0–1) */
  setVolume: (v: number) => void;
  /** Toggle mute/unmute */
  toggleMute: () => void;
}

export function useAudioStream({
  camera,
  autoConnect = false,
}: UseAudioStreamOptions): UseAudioStreamResult {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAvailable, setIsAvailable] = useState(true);
  const [volume, setVolumeState] = useState(0.8);
  const [isMuted, setIsMuted] = useState(true); // Start muted
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const sampleRateRef = useRef(48000);
  const channelsRef = useRef(1);
  const nextPlayTimeRef = useRef(0);
  const isConnectedRef = useRef(false);

  // Apply gain changes immediately
  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.setValueAtTime(
        isMuted ? 0 : volume,
        audioCtxRef.current?.currentTime ?? 0,
      );
    }
  }, [volume, isMuted]);

  const disconnect = useCallback(() => {
    isConnectedRef.current = false;

    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {
        // ignore
      }
      wsRef.current = null;
    }

    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    gainNodeRef.current = null;
    nextPlayTimeRef.current = 0;
    setIsPlaying(false);
  }, []);

  const connect = useCallback(() => {
    if (isConnectedRef.current) return;

    setError(null);
    setIsAvailable(true);

    const token = tokenStorage.getAccessToken();
    if (!token) {
      setError('Not authenticated');
      return;
    }

    const wsUrl = `${STREAMING_WS_BASE_URL}/audio/${encodeURIComponent(camera.id)}?token=${encodeURIComponent(token)}`;

    try {
      const ws = new WebSocket(wsUrl);
      ws.binaryType = 'arraybuffer';
      wsRef.current = ws;
      isConnectedRef.current = true;

      ws.onopen = () => {
        console.log(`[AudioStream] Connected for camera ${camera.id}`);
      };

      ws.onmessage = (event) => {
        // Text messages are JSON metadata or pings
        if (typeof event.data === 'string') {
          if (event.data === 'ping') {
            ws.send('pong');
            return;
          }
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'audio_metadata') {
              sampleRateRef.current = msg.sampleRate || 48000;
              channelsRef.current = msg.channels || 1;

              // Create AudioContext with the stream's sample rate
              const ctx = new AudioContext({ sampleRate: sampleRateRef.current });
              audioCtxRef.current = ctx;

              const gain = ctx.createGain();
              gain.gain.setValueAtTime(isMuted ? 0 : volume, ctx.currentTime);
              gain.connect(ctx.destination);
              gainNodeRef.current = gain;

              nextPlayTimeRef.current = 0;
              setIsPlaying(true);
              return;
            }
            if (msg.type === 'error') {
              setError(msg.message || 'Audio error');
              setIsAvailable(false);
              disconnect();
              return;
            }
            if (msg.error) {
              setError(msg.error);
              setIsAvailable(false);
              disconnect();
              return;
            }
          } catch {
            // Not JSON, ignore
          }
          return;
        }

        // Binary message = PCM audio chunk
        const ctx = audioCtxRef.current;
        const gain = gainNodeRef.current;
        if (!ctx || !gain) return;

        // Resume context if browser suspended it (autoplay policy)
        if (ctx.state === 'suspended') {
          ctx.resume();
        }

        const floatData = new Float32Array(event.data);
        const buffer = ctx.createBuffer(
          channelsRef.current,
          floatData.length / channelsRef.current,
          sampleRateRef.current,
        );

        // Fill buffer channel(s)
        for (let ch = 0; ch < channelsRef.current; ch++) {
          const channelData = buffer.getChannelData(ch);
          for (let i = 0; i < channelData.length; i++) {
            channelData[i] = floatData[i * channelsRef.current + ch];
          }
        }

        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(gain);

        // Schedule playback
        const now = ctx.currentTime;
        if (nextPlayTimeRef.current < now) {
          nextPlayTimeRef.current = now + 0.01; // Small offset to avoid clicks
        }
        source.start(nextPlayTimeRef.current);
        nextPlayTimeRef.current += buffer.duration;
      };

      ws.onerror = () => {
        setError('Audio connection error');
        setIsPlaying(false);
      };

      ws.onclose = (ev) => {
        isConnectedRef.current = false;
        setIsPlaying(false);
        if (ev.code === 4005) {
          setIsAvailable(false);
        }
      };
    } catch (err) {
      setError(`Failed to connect audio: ${err}`);
      isConnectedRef.current = false;
    }
  }, [camera.id, disconnect, isMuted, volume]);

  // Auto-connect when requested
  useEffect(() => {
    if (autoConnect) {
      connect();
    }
    return () => {
      disconnect();
    };
    // eslint-disable-next-line
  }, [camera.id]);

  const setVolume = useCallback((v: number) => {
    setVolumeState(Math.max(0, Math.min(1, v)));
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  return {
    isPlaying,
    isAvailable,
    volume,
    isMuted,
    error,
    connect,
    disconnect,
    setVolume,
    toggleMute,
  };
}

export default useAudioStream;
