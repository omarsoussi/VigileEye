/**
 * WebRTCPlayer Component
 * 
 * Real-time video player for security camera streams using WebRTC.
 * Features:
 * - Sub-second latency (<400-800ms)
 * - Automatic reconnection
 * - Connection status indicators
 * - Latency monitoring
 */
import React from 'react';
import { useWebRTCStream } from '../hooks/useWebRTCStream';
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
  const { state, connect, disconnect } = useWebRTCStream({
    cameraId,
    authToken,
    autoConnect,
  });

  return (
    <div className={`webrtc-player ${className}`}>
      {/* Video Element - using img for HTTP MJPEG streaming */}
      <div className="video-container">
        {state.frameUrl ? (
          <img
            src={state.frameUrl}
            alt="Live stream"
            className="video-stream"
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        ) : (
          <div className="video-stream" style={{ background: '#000', width: '100%', height: '100%' }} />
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
              ⚠️ {state.error}
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
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WebRTCPlayer;
