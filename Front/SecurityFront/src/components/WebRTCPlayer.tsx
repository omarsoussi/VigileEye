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
import React from 'react';
import { useWHEPStream } from '../hooks/useWHEPStream';
import './WebRTCPlayer.css';

interface WebRTCPlayerProps {
  cameraId: string;
  authToken: string;
  autoConnect?: boolean;
  showControls?: boolean;
  className?: string;
}

const WebRTCPlayer: React.FC<WebRTCPlayerProps> = ({
  cameraId,
  authToken,
  autoConnect = true,
  showControls = true,
  className = '',
}) => {
  const { videoRef, state, connect, disconnect } = useWHEPStream({
    cameraId,
    authToken,
    autoConnect,
  });

  const modeLabel = state.mode === 'whep' ? 'WHEP' : state.mode === 'webrtc' ? 'WebRTC' : state.mode === 'http' ? 'HTTP' : '';

  return (
    <div className={`webrtc-player ${className}`}>
      {/* Video Element */}
      <div className="video-container">
        {/* WebRTC/WHEP mode: native <video> element for MediaStream */}
        {(state.mode === 'whep' || state.mode === 'webrtc') && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
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
            src={state.frameUrl}
            alt="Live stream"
            className="video-stream"
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
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
