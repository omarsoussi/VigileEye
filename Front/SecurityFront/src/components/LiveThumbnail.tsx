/**
 * LiveThumbnail – compact live-preview for camera cards.
 *
 * Connects to the streaming backend via useWebRTCStream and renders
 * live JPEG frames. Shows contextual placeholders:
 *   - Spinner + "Connecting…"  while the WS is being established
 *   - Camera icon + "No Signal" when WS is open but no frames arrive
 *   - Camera-off  + "Offline"   when the connection fails
 *   - Camera-off  + "Disabled"  when the camera is deactivated
 */
import React from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext';
import { useWHEPStream } from '../hooks/useWHEPStream';
import { CameraResponse, tokenStorage } from '../services/api';
import { HiOutlineVideoCamera, HiOutlineRefresh } from 'react-icons/hi';
import { BsCircleFill } from 'react-icons/bs';
import { RiCameraOffLine } from 'react-icons/ri';

interface LiveThumbnailProps {
  camera: CameraResponse;
  height?: string | number;
  isOnline?: boolean;
  showFps?: boolean;
  showStatus?: boolean;
  borderRadius?: string | number;
}

export const LiveThumbnail: React.FC<LiveThumbnailProps> = ({
  camera,
  height = '100%',
  isOnline = true,
  showFps = false,
  showStatus = true,
  borderRadius = '12px',
}) => {
  const { colors, preferences } = useTheme();
  const isDark = preferences.mode === 'dark';
  const authToken = tokenStorage.getAccessToken() || '';

  const shouldConnect = camera.is_active !== false;

  const { videoRef, state } = useWHEPStream({
    cameraId: camera.id,
    authToken,
    autoConnect: shouldConnect,
    streamUrl: camera.stream_url,
  });

  const { isConnected, isConnecting, hasFrames, error, frameUrl, fps, latency } = state;
  const hasError = !!error;

  // ── Status badge derivation ──
  const getStatusLabel = () => {
    if (!camera.is_active) return { text: 'DISABLED', color: '#6b7280' };
    if (hasError)          return { text: 'OFFLINE',  color: '#ef4444' };
    if (hasFrames)         return { text: 'LIVE',     color: '#22c55e' };
    if (isConnected)       return { text: 'NO SIGNAL', color: '#f59e0b' };
    if (isConnecting)      return { text: 'CONNECTING', color: '#f59e0b' };
    return { text: 'ONLINE', color: '#22c55e' };
  };
  const statusInfo = getStatusLabel();

  // ── Placeholder text ──
  const getPlaceholder = (): { icon: React.ReactNode; text: string; dim: boolean } => {
    if (!camera.is_active) return {
      icon: <RiCameraOffLine size={24} style={{ color: '#6b7280', opacity: 0.7 }} />,
      text: 'Disabled',
      dim: true,
    };
    if (hasError) return {
      icon: <RiCameraOffLine size={24} style={{ color: '#ef4444', opacity: 0.7 }} />,
      text: 'Offline',
      dim: true,
    };
    if (isConnected && !hasFrames) return {
      icon: <HiOutlineVideoCamera size={24} style={{ color: '#f59e0b', opacity: 0.7 }} />,
      text: 'No Signal',
      dim: false,
    };
    // Still connecting — spinner
    return {
      icon: (
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
          <HiOutlineRefresh size={22} style={{ color: colors.accent }} />
        </motion.div>
      ),
      text: 'Connecting…',
      dim: false,
    };
  };

  return (
    <div style={{
      width: '100%', height, borderRadius,
      overflow: 'hidden', position: 'relative',
      background: isDark ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.1)',
    }}>
      {/* Live WebRTC/WHEP video (native <video> element) */}
      {(state.mode === 'whep' || state.mode === 'webrtc') && hasFrames && (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            width: '100%', height: '100%', objectFit: 'cover', display: 'block',
          }}
        />
      )}
      {/* HTTP fallback: JPEG frame */}
      {state.mode === 'http' && frameUrl && (
        <img src={frameUrl} alt={camera.name} style={{
          width: '100%', height: '100%', objectFit: 'cover', display: 'block',
        }} />
      )}

      {/* Placeholder when no frame and not using native video */}
      {!hasFrames && (() => {
        const ph = getPlaceholder();
        return (
          <div style={{
            width: '100%', height: '100%',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: '6px',
            filter: ph.dim ? 'grayscale(1) brightness(0.5)' : 'none',
          }}>
            {ph.icon}
            <span style={{
              fontSize: '10px', color: colors.textSecondary, opacity: 0.7,
              textAlign: 'center', maxWidth: '90%',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {ph.text}
            </span>
          </div>
        );
      })()}

      {/* Status badge */}
      {showStatus && (
        <div style={{
          position: 'absolute', top: '6px', left: '6px',
          display: 'flex', alignItems: 'center', gap: '4px',
          padding: '2px 7px', borderRadius: '6px',
          background: `${statusInfo.color}dd`, backdropFilter: 'blur(8px)',
        }}>
          {hasFrames ? (
            <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1.2 }}>
              <BsCircleFill size={5} color="#fff" />
            </motion.div>
          ) : (
            <BsCircleFill size={5} color="#fff" />
          )}
          <span style={{
            fontSize: '8px', fontWeight: 700, color: '#fff',
            textTransform: 'uppercase', letterSpacing: '0.3px',
          }}>
            {statusInfo.text}
          </span>
        </div>
      )}

      {/* FPS / latency overlay */}
      {showFps && hasFrames && (fps > 0 || latency) && (
        <div style={{
          position: 'absolute', top: '6px', right: '6px',
          display: 'flex', gap: '4px', alignItems: 'center',
        }}>
          {fps > 0 && (
            <span style={{
              padding: '2px 6px', borderRadius: '4px',
              background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
              fontSize: '9px', fontWeight: 700, color: '#fff',
            }}>
              {fps} FPS
            </span>
          )}
        </div>
      )}

      {/* Gradient overlay for readability */}
      {hasFrames && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%',
          background: 'linear-gradient(transparent, rgba(0,0,0,0.5))',
          pointerEvents: 'none',
        }} />
      )}
    </div>
  );
};

export default LiveThumbnail;
