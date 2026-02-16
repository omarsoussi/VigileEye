/**
 * LiveStreamPlayer component for displaying real-time video streams.
 * 
 * Uses WebSocket connection to receive JPEG frames from the Video Streaming service.
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVideoStream, StreamConnectionState } from '../hooks/useVideoStream';
import { CameraResponse } from '../services/api';
import { useTheme } from '../contexts/ThemeContext';
import { 
  HiOutlinePlay, 
  HiOutlinePause, 
  HiOutlineRefresh,
  HiOutlineExclamationCircle,
  HiOutlineWifi,
  HiOutlineDotsVertical,
  HiOutlineCog,
  HiOutlinePhotograph,
  HiOutlineVolumeUp,
  HiOutlineVolumeOff,
  HiOutlineVideoCamera,
  HiOutlineShare,
} from 'react-icons/hi';
import { BsCircleFill, BsRecordCircle } from 'react-icons/bs';
import { RiFullscreenLine, RiFullscreenExitLine } from 'react-icons/ri';

interface LiveStreamPlayerProps {
  camera: CameraResponse;
  autoPlay?: boolean;
  showControls?: boolean;
  showOverlay?: boolean;
  aspectRatio?: string;
  onError?: (error: Error) => void;
  onRecordingChange?: (isRecording: boolean) => void;
  style?: React.CSSProperties;
}

const ConnectionStatus: React.FC<{ state: StreamConnectionState; fps: number }> = ({ state, fps }) => {
  const { colors } = useTheme();
  
  const statusConfig = {
    disconnected: { color: colors.textSecondary, text: 'Disconnected', icon: HiOutlineWifi },
    connecting: { color: '#f59e0b', text: 'Connecting...', icon: HiOutlineRefresh },
    connected: { color: '#22c55e', text: `Live • ${fps} FPS`, icon: BsCircleFill },
    error: { color: '#ef4444', text: 'Error', icon: HiOutlineExclamationCircle },
  };
  
  const config = statusConfig[state];
  const Icon = config.icon;
  
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      padding: '6px 12px',
      borderRadius: '20px',
      background: 'rgba(0, 0, 0, 0.6)',
      backdropFilter: 'blur(8px)',
    }}>
      <Icon 
        size={state === 'connecting' ? 14 : 10} 
        color={config.color}
        style={state === 'connecting' ? { animation: 'spin 1s linear infinite' } : {}}
      />
      <span style={{ 
        fontSize: '12px', 
        fontWeight: 600, 
        color: config.color,
        letterSpacing: '0.5px',
      }}>
        {config.text}
      </span>
    </div>
  );
};

// Dropdown menu for settings
const SettingsMenu: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSnapshot: () => void;
  onToggleRecording: () => void;
  onOpenSettings: () => void;
  onShare: () => void;
  isRecording: boolean;
}> = ({ isOpen, onClose, onSnapshot, onToggleRecording, onOpenSettings, onShare, isRecording }) => {
  const { colors, preferences } = useTheme();
  const isDark = preferences.mode === 'dark';

  const menuItems = [
    { icon: HiOutlinePhotograph, label: 'Take Snapshot', onClick: onSnapshot },
    { icon: isRecording ? BsCircleFill : BsRecordCircle, label: isRecording ? 'Stop Recording' : 'Start Recording', onClick: onToggleRecording, color: isRecording ? '#ef4444' : undefined },
    { icon: HiOutlineCog, label: 'Camera Settings', onClick: onOpenSettings },
    { icon: HiOutlineShare, label: 'Share Stream', onClick: onShare },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 1000,
            }}
          />
          {/* Menu */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            style={{
              position: 'absolute',
              top: '50px',
              right: '12px',
              minWidth: '180px',
              background: isDark ? 'rgba(20, 20, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)',
              borderRadius: '12px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
              backdropFilter: 'blur(20px)',
              overflow: 'hidden',
              zIndex: 1001,
            }}
          >
            {menuItems.map((item, index) => (
              <motion.button
                key={index}
                whileHover={{ backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}
                onClick={(e) => {
                  e.stopPropagation();
                  item.onClick();
                  onClose();
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '14px 16px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: item.color || colors.text,
                  fontSize: '14px',
                  fontWeight: 500,
                  textAlign: 'left',
                }}
              >
                <item.icon size={18} />
                {item.label}
              </motion.button>
            ))}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export const LiveStreamPlayer: React.FC<LiveStreamPlayerProps> = ({
  camera,
  autoPlay = false,
  showControls = true,
  showOverlay = true,
  aspectRatio = '16/9',
  onError,
  onRecordingChange,
  style,
}) => {
  const { colors, preferences } = useTheme();
  const isDark = preferences.mode === 'dark';
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [snapshotNotification, setSnapshotNotification] = useState(false);

  const {
    connectionState,
    frameUrl,
    fps,
    connect,
    disconnect,
    isStreaming,
    error,
    takeSnapshot,
  } = useVideoStream({
    camera,
    autoConnect: autoPlay,
    onError,
  });

  const handlePlayPause = () => {
    if (isStreaming) {
      disconnect();
    } else {
      connect();
    }
  };

  const handleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;

    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.error('Fullscreen error:', err);
    }
  }, []);

  const handleSnapshot = useCallback(() => {
    const blob = takeSnapshot();
    if (blob) {
      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${camera.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      // Show notification
      setSnapshotNotification(true);
      setTimeout(() => setSnapshotNotification(false), 2000);
    }
  }, [takeSnapshot, camera.name]);

  const handleToggleRecording = useCallback(() => {
    const newRecording = !isRecording;
    setIsRecording(newRecording);
    if (onRecordingChange) {
      onRecordingChange(newRecording);
    }
  }, [isRecording, onRecordingChange]);

  const handleToggleMute = useCallback(() => {
    setIsMuted(!isMuted);
  }, [isMuted]);

  const handleOpenSettings = useCallback(() => {
    console.log('Opening camera settings for:', camera.id);
  }, [camera.id]);

  const handleShare = useCallback(() => {
    const streamUrl = `${window.location.origin}/monitoring?camera=${camera.id}`;
    if (navigator.share) {
      navigator.share({
        title: `${camera.name} Live Stream`,
        url: streamUrl,
      });
    } else {
      navigator.clipboard.writeText(streamUrl);
      alert('Stream URL copied to clipboard!');
    }
  }, [camera.id, camera.name]);

  // Handle fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: isFullscreen ? 'auto' : aspectRatio,
        height: isFullscreen ? '100vh' : undefined,
        borderRadius: isFullscreen ? 0 : '16px',
        overflow: 'hidden',
        background: isDark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.1)',
        ...style,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Video Frame */}
      {frameUrl ? (
        <img
          src={frameUrl}
          alt={camera.name}
          style={{
            width: '100%',
            height: '100%',
            objectFit: isFullscreen ? 'contain' : 'cover',
          }}
        />
      ) : (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: '12px',
            color: colors.textSecondary,
          }}
        >
          {connectionState === 'connecting' ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                <HiOutlineRefresh size={32} />
              </motion.div>
              <span>Connecting to stream...</span>
            </>
          ) : connectionState === 'error' ? (
            <>
              <HiOutlineExclamationCircle size={32} color="#ef4444" />
              <span style={{ color: '#ef4444', textAlign: 'center', padding: '0 12px' }}>{error || 'Stream error'}</span>
              {showControls && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={connect}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    background: colors.accent,
                    color: '#fff',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 600,
                  }}
                >
                  Retry
                </motion.button>
              )}
            </>
          ) : (
            <>
              <HiOutlineVideoCamera size={48} style={{ opacity: 0.5 }} />
              <span>Click to start stream</span>
            </>
          )}
        </div>
      )}

      {/* Recording indicator */}
      {isRecording && (
        <motion.div
          animate={{ opacity: [1, 0.5, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
          style={{
            position: 'absolute',
            top: '12px',
            left: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            borderRadius: '8px',
            background: 'rgba(239, 68, 68, 0.9)',
          }}
        >
          <BsRecordCircle size={12} color="#fff" />
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#fff' }}>REC</span>
        </motion.div>
      )}

      {/* Snapshot notification */}
      <AnimatePresence>
        {snapshotNotification && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              padding: '16px 24px',
              borderRadius: '12px',
              background: 'rgba(34, 197, 94, 0.9)',
              color: '#fff',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <HiOutlinePhotograph size={20} />
            Snapshot saved!
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overlay */}
      {showOverlay && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovered || !isStreaming ? 1 : 0 }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, transparent 30%, transparent 70%, rgba(0,0,0,0.7) 100%)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '12px',
          }}
        >
          {/* Top bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h3 style={{ 
                margin: 0, 
                fontSize: '16px', 
                fontWeight: 600, 
                color: '#fff',
                textShadow: '0 1px 3px rgba(0,0,0,0.5)',
              }}>
                {camera.name}
              </h3>
              {camera.location && (
                <p style={{ 
                  margin: '4px 0 0', 
                  fontSize: '12px', 
                  color: 'rgba(255,255,255,0.7)',
                }}>
                  {camera.location.building} {camera.location.zone && `• ${camera.location.zone}`}
                </p>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ConnectionStatus state={connectionState} fps={fps} />
              {showControls && (
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowSettingsMenu(!showSettingsMenu);
                  }}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: 'rgba(0, 0, 0, 0.5)',
                    backdropFilter: 'blur(8px)',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#fff',
                  }}
                >
                  <HiOutlineDotsVertical size={18} />
                </motion.button>
              )}
            </div>
          </div>

          {/* Settings Menu */}
          <SettingsMenu
            isOpen={showSettingsMenu}
            onClose={() => setShowSettingsMenu(false)}
            onSnapshot={handleSnapshot}
            onToggleRecording={handleToggleRecording}
            onOpenSettings={handleOpenSettings}
            onShare={handleShare}
            isRecording={isRecording}
          />

          {/* Bottom bar with controls */}
          {showControls && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px' }}>
              {/* Audio toggle */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleToggleMute}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.15)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#fff',
                }}
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <HiOutlineVolumeOff size={18} /> : <HiOutlineVolumeUp size={18} />}
              </motion.button>

              {/* Play/Pause */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handlePlayPause}
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#fff',
                }}
              >
                {isStreaming ? <HiOutlinePause size={28} /> : <HiOutlinePlay size={28} />}
              </motion.button>

              {/* Fullscreen */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleFullscreen}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.15)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#fff',
                }}
                title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              >
                {isFullscreen ? <RiFullscreenExitLine size={18} /> : <RiFullscreenLine size={18} />}
              </motion.button>
            </div>
          )}
        </motion.div>
      )}

      {/* CSS for spinner animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default LiveStreamPlayer;
