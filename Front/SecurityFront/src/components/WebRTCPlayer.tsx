/**
 * WebRTCPlayer Component
 * 
 * Real-time video player for security camera streams.
 * Streaming modes (tried in priority order):
 * 1. WHEP — Direct WebRTC via MediaMTX (sub-second latency, no backend signaling)
 * 2. Backend WebRTC — Proxied signaling through Go backend (fallback)
 * 3. HTTP JPEG polling — Lowest latency fallback for non-WebRTC browsers
 *
 * Features:
 * - Sub-second latency via MediaMTX WHEP or pion/webrtc
 * - Automatic cascading fallback
 * - Connection status indicators
 * - Latency monitoring
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useWHEPStream, WHEPStreamState } from '../hooks/useWHEPStream';
import { ZoneResponse } from '../services/api';
import './WebRTCPlayer.css';

interface WebRTCPlayerProps {
  cameraId: string;
  authToken: string;
  streamUrl?: string;
  autoConnect?: boolean;
  showControls?: boolean;
  className?: string;
  showZones?: boolean;
  zones?: ZoneResponse[];
  externalVideoRef?: React.RefObject<HTMLVideoElement>;
  onStateChange?: (state: WHEPStreamState) => void;
}

const WebRTCPlayer: React.FC<WebRTCPlayerProps> = ({
  cameraId,
  authToken,
  streamUrl,
  autoConnect = true,
  showControls = true,
  className = '',
  showZones = false,
  zones = [],
  externalVideoRef,
  onStateChange,
}) => {
  const { videoRef, state, connect, disconnect } = useWHEPStream({
    cameraId,
    authToken,
    autoConnect,
    streamUrl,
  });

  useEffect(() => {
    onStateChange?.(state);
  }, [onStateChange, state]);

  const [isMuted, setIsMuted] = useState(true);

  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.muted = isMuted;
  }, [isMuted, videoRef]);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const drawableZones = useMemo(() => (zones || []).filter((z) => (z?.points?.length || 0) >= 3), [zones]);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const getIntrinsicSize = () => {
      if ((state.mode === 'whep' || state.mode === 'webrtc') && videoRef.current) {
        const vw = videoRef.current.videoWidth;
        const vh = videoRef.current.videoHeight;
        if (vw > 0 && vh > 0) return { w: vw, h: vh };
      }
      if (state.mode === 'http' && imgRef.current) {
        const iw = imgRef.current.naturalWidth;
        const ih = imgRef.current.naturalHeight;
        if (iw > 0 && ih > 0) return { w: iw, h: ih };
      }
      return null;
    };

    const draw = () => {
      const cssW = container.clientWidth;
      const cssH = container.clientHeight;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.floor(cssW * dpr));
      canvas.height = Math.max(1, Math.floor(cssH * dpr));
      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${cssH}px`;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cssW, cssH);

      if (!showZones || drawableZones.length === 0) return;

      // Align overlay to the displayed media area (object-fit: contain).
      const intrinsic = getIntrinsicSize();
      let rect = { x: 0, y: 0, w: cssW, h: cssH };
      if (intrinsic) {
        const mediaAspect = intrinsic.w / intrinsic.h;
        const boxAspect = cssW / cssH;
        if (mediaAspect > boxAspect) {
          const h = cssW / mediaAspect;
          rect = { x: 0, y: (cssH - h) / 2, w: cssW, h };
        } else {
          const w = cssH * mediaAspect;
          rect = { x: (cssW - w) / 2, y: 0, w, h: cssH };
        }
      }

      drawableZones.forEach((zone) => {
        const zoneColor = zone.color || '#ef4444';

        ctx.beginPath();
        zone.points.forEach((p, i) => {
          const px = rect.x + p.x * rect.w;
          const py = rect.y + p.y * rect.h;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.closePath();

        ctx.fillStyle = zone.is_active ? `${zoneColor}30` : `${zoneColor}10`;
        ctx.fill();
        ctx.strokeStyle = zone.is_active ? zoneColor : `${zoneColor}60`;
        ctx.lineWidth = 2;
        ctx.setLineDash(zone.is_active ? [] : [6, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Label
        const cx = zone.points.reduce((s, p) => s + p.x, 0) / zone.points.length;
        const cy = zone.points.reduce((s, p) => s + p.y, 0) / zone.points.length;
        const lx = rect.x + cx * rect.w;
        const ly = rect.y + cy * rect.h;
        const label = zone.name;

        ctx.font = 'bold 12px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const metrics = ctx.measureText(label);
        const padding = 6;
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.beginPath();
        // roundRect is supported in modern browsers; silently falls back if absent.
        (ctx as any).roundRect?.(lx - metrics.width / 2 - padding, ly - 8 - padding, metrics.width + padding * 2, 16 + padding * 2, 6);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.fillText(label, lx, ly);
      });
    };

    draw();

    const observer = new ResizeObserver(() => draw());
    observer.observe(container);

    // Redraw after metadata becomes available (videoWidth/naturalWidth).
    const id = window.setInterval(() => {
      if (!showZones || drawableZones.length === 0) return;
      draw();
    }, 500);

    return () => {
      observer.disconnect();
      window.clearInterval(id);
    };
  }, [showZones, drawableZones, state.mode, videoRef]);

  const modeLabel = state.mode === 'whep' ? 'WHEP' : state.mode === 'webrtc' ? 'WebRTC' : state.mode === 'http' ? 'HTTP' : '';

  return (
    <div className={`webrtc-player ${className}`}>
      {/* Video Element */}
      <div className="video-container" ref={containerRef}>
        {/* WebRTC/WHEP mode: native <video> element for MediaStream */}
        {(state.mode === 'whep' || state.mode === 'webrtc') && (
          <video
            ref={(el) => {
              videoRef.current = el;
              if (externalVideoRef) externalVideoRef.current = el;
            }}
            autoPlay
            playsInline
            className="video-stream"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              display: state.hasFrames ? 'block' : 'none',
            }}
          />
        )}

        {/* HTTP fallback mode: <img> element for JPEG frames */}
        {state.mode === 'http' && state.frameUrl && (
          <img
            ref={imgRef}
            src={state.frameUrl}
            alt="Live stream"
            className="video-stream"
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        )}

        {/* Zones overlay */}
        {showZones && drawableZones.length > 0 && (
          <canvas
            ref={canvasRef}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
              zIndex: 2,
            }}
          />
        )}

        {/* No stream yet placeholder */}
        {!state.hasFrames && (
          <div
            className="video-stream"
            style={{
              background: '#000',
              width: '100%',
              height: '100%',
              position: (state.mode === 'whep' || state.mode === 'webrtc') ? 'absolute' : 'relative',
              top: 0,
              left: 0,
            }}
          />
        )}
        
        {/* Overlay Status Indicators */}
        <div className="video-overlay">
          {state.isConnecting && (
            <div className="status-badge connecting">
              <span className="spinner"></span>
              Connecting...
            </div>
          )}
          
          {state.hasFrames && (
            <div className="status-badge connected">
              <span className="dot-pulse"></span>
              LIVE
              {modeLabel && (
                <span className="mode-badge">{modeLabel}</span>
              )}
              {state.latency && (
                <span className="latency">{state.latency}ms</span>
              )}
            </div>
          )}

          {state.isConnected && !state.hasFrames && !state.isConnecting && (
            <div className="status-badge connecting">
              No Signal
            </div>
          )}
          
          {state.error && (
            <div className="status-badge error">
              {state.error}
            </div>
          )}
        </div>

        {/* Audio toggle (requires user gesture) */}
        {state.hasFrames && (state.mode === 'whep' || state.mode === 'webrtc') && (
          <button
            onClick={() => {
              const next = !isMuted;
              setIsMuted(next);
              const v = videoRef.current;
              if (v) {
                v.muted = next;
                v.play().catch(() => {});
              }
            }}
            style={{
              position: 'absolute',
              bottom: 12,
              left: 12,
              zIndex: 5,
              padding: '10px 14px',
              borderRadius: '12px',
              background: 'rgba(255,255,255,0.2)',
              backdropFilter: 'blur(10px)',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 600,
            }}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? 'Sound Off' : 'Sound On'}
          </button>
        )}
      </div>

      {/* Controls */}
      {showControls && (
        <div className="controls">
          {!state.isConnected && !state.isConnecting && (
            <button onClick={connect} className="btn btn-primary">
              Connect
            </button>
          )}
          
          {(state.isConnected || state.isConnecting) && (
            <button onClick={disconnect} className="btn btn-danger">
              Disconnect
            </button>
          )}
          
          {state.isConnected && state.latency && (
            <div className="latency-info">
              Latency: <strong>{state.latency}ms</strong>
              {state.fps > 0 && <span> | {state.fps} FPS</span>}
              {state.viewerCount > 0 && <span> | {state.viewerCount} viewers</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WebRTCPlayer;
