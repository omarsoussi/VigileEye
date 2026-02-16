import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { GlassCard, AnimatedButton } from '../../components/GlassCard';
import { camerasApi, streamingApi, CameraResponse } from '../../services/api';
import { LiveStreamPlayer } from '../../components/LiveStreamPlayer';
import { useVideoStream } from '../../hooks/useVideoStream';
import { 
  HiOutlineArrowLeft,
  HiOutlineDotsVertical,
  HiOutlineVideoCamera,
  HiOutlinePhotograph,
  HiOutlineMicrophone,
  HiOutlineVolumeUp,
  HiOutlineVolumeOff,
  HiOutlineZoomIn,
  HiOutlineAdjustments,
  HiOutlineCloudDownload,
  HiOutlineShare,
  HiOutlinePlay,
  HiOutlinePause,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineRefresh,
  HiOutlineExclamationCircle,
  HiOutlineStop,
  HiOutlineSearch,
  HiOutlineX,
} from 'react-icons/hi';
import { BsCircleFill, BsRecordCircle, BsGrid3X3Gap, BsList } from 'react-icons/bs';
import { RiFullscreenLine, RiFullscreenExitLine } from 'react-icons/ri';

// Helper to get camera status for display
const getCameraDisplayStatus = (
  camera: CameraResponse,
  recordingCameraIds?: ReadonlySet<string>
): 'live' | 'offline' | 'recording' => {
  if (!camera.is_active) return 'offline';
  if (camera.status !== 'online') return 'offline';
  if (recordingCameraIds?.has(camera.id)) return 'recording';
  return 'live';
};

// Helper to get camera location string
const getCameraLocationString = (camera: CameraResponse): string => {
  if (camera.location) {
    const parts = [camera.location.building, camera.location.zone, camera.location.floor].filter(Boolean);
    return parts.join(' • ') || 'Unknown';
  }
  return 'Unknown';
};

// Mini thumbnail component that shows a live preview
const CameraThumbnail: React.FC<{
  camera: CameraResponse;
  isOffline: boolean;
  height: number;
}> = ({ camera, isOffline, height }) => {
  const { colors, preferences } = useTheme();
  const isDark = preferences.mode === 'dark';
  
  const { frameUrl, connect, connectionState, error } = useVideoStream({
    camera,
    autoConnect: !isOffline, // Auto-connect only if camera is online
  });

  // Show frame if available
  if (frameUrl && connectionState === 'connected') {
    return (
      <img
        src={frameUrl}
        alt={camera.name}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      />
    );
  }

  // Status message based on connection state
  const getStatusInfo = () => {
    if (isOffline) {
      return { text: 'Offline', icon: <HiOutlineExclamationCircle size={20} style={{ color: colors.textSecondary }} /> };
    }
    switch (connectionState) {
      case 'connecting':
        return { text: 'Connecting...', icon: (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <HiOutlineRefresh size={24} style={{ color: colors.accent }} />
          </motion.div>
        )};
      case 'error':
        return { text: error || 'Stream Error', icon: <HiOutlineExclamationCircle size={24} style={{ color: '#ef4444' }} /> };
      case 'connected':
        return { text: 'Loading stream...', icon: (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <HiOutlineRefresh size={20} style={{ color: colors.accent }} />
          </motion.div>
        )};
      default:
        return { text: 'Tap to connect', icon: <HiOutlineVideoCamera size={28} style={{ opacity: 0.5, color: colors.textSecondary }} /> };
    }
  };

  const statusInfo = getStatusInfo();

  // Show placeholder with status
  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: isDark ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.15)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      filter: isOffline ? 'grayscale(1) brightness(0.5)' : 'none',
    }}>
      {statusInfo.icon}
      <span style={{ 
        fontSize: '11px', 
        color: colors.textSecondary, 
        opacity: 0.8,
        textAlign: 'center',
        padding: '0 8px',
        maxWidth: '90%',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {statusInfo.text}
      </span>
    </div>
  );
};

const CameraGrid: React.FC<{ 
  cameras: CameraResponse[];
  recordingCameraIds: ReadonlySet<string>;
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
  onSelectCamera: (camera: CameraResponse) => void;
}> = ({ cameras, recordingCameraIds, isLoading, error, onRefresh, onSelectCamera }) => {
  const { colors, preferences } = useTheme();
  const isDark = preferences.mode === 'dark';
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filter, setFilter] = useState<'all' | 'live' | 'recording' | 'offline'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter cameras based on search and status filter
  const filteredCameras = useMemo(() => {
    return cameras.filter(camera => {
      // Search filter
      const matchesSearch = searchQuery === '' || 
        camera.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        camera.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        camera.location?.building?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        camera.location?.zone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        camera.location?.room?.toLowerCase().includes(searchQuery.toLowerCase());

      // Status filter
      if (filter === 'all') return matchesSearch;
      const status = getCameraDisplayStatus(camera, recordingCameraIds);
      return matchesSearch && status === filter;
    });
  }, [cameras, recordingCameraIds, filter, searchQuery]);

  const statusCounts = useMemo(() => ({
    all: cameras.length,
    live: cameras.filter(c => getCameraDisplayStatus(c, recordingCameraIds) === 'live').length,
    recording: cameras.filter(c => getCameraDisplayStatus(c, recordingCameraIds) === 'recording').length,
    offline: cameras.filter(c => getCameraDisplayStatus(c, recordingCameraIds) === 'offline').length,
  }), [cameras, recordingCameraIds]);

  return (
    <div style={{
      minHeight: '100vh',
      padding: 'clamp(16px, 3vw, 32px)',
      paddingTop: 'max(60px, clamp(16px, 3vw, 32px))',
      paddingBottom: 'clamp(100px, 12vh, 150px)',
      width: '100%',
      margin: '0 auto',
    }}>
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
        }}
      >
        <h1 style={{
          fontSize: '32px',
          fontWeight: 700,
          color: colors.text,
          letterSpacing: '-0.5px',
        }}>
          Live View
        </h1>
        
        <div style={{ display: 'flex', gap: '8px' }}>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onRefresh}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: colors.text,
            }}
          >
            <HiOutlineRefresh size={18} className={isLoading ? 'animate-spin' : ''} />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setViewMode('grid')}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: viewMode === 'grid' 
                ? colors.accent 
                : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: viewMode === 'grid' ? '#fff' : colors.text,
            }}
          >
            <BsGrid3X3Gap size={18} />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setViewMode('list')}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: viewMode === 'list' 
                ? colors.accent 
                : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: viewMode === 'list' ? '#fff' : colors.text,
            }}
          >
            <BsList size={20} />
          </motion.button>
        </div>
      </motion.div>

      {/* Search Bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        style={{
          position: 'relative',
          marginBottom: '16px',
        }}
      >
        <HiOutlineSearch 
          size={20} 
          color={colors.textMuted} 
          style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', zIndex: 1 }}
        />
        <input
          type="text"
          placeholder="Search cameras by name, location..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            padding: '14px 44px 14px 44px',
            borderRadius: '14px',
            background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.8)',
            border: '1px solid ' + (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'),
            color: colors.text,
            fontSize: '15px',
            outline: 'none',
            backdropFilter: 'blur(10px)',
          }}
        />
        {searchQuery && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setSearchQuery('')}
            style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
              border: 'none',
              borderRadius: '8px',
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <HiOutlineX size={14} color={colors.textMuted} />
          </motion.button>
        )}
      </motion.div>

      {/* Status Summary */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '20px',
          overflowX: 'auto',
          paddingBottom: '8px',
        }}
      >
        {[
          { label: 'All', key: 'all' as const, count: statusCounts.all, color: colors.accent },
          { label: 'Live', key: 'live' as const, count: statusCounts.live, color: '#22c55e' },
          { label: 'Recording', key: 'recording' as const, count: statusCounts.recording, color: '#ef4444' },
          { label: 'Offline', key: 'offline' as const, count: statusCounts.offline, color: '#6b7280' },
        ].map((filterItem) => (
          <motion.button
            key={filterItem.label}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setFilter(filterItem.key)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              borderRadius: '20px',
              border: 'none',
              background: filter === filterItem.key 
                ? isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)'
                : 'transparent',
              cursor: 'pointer',
              color: colors.text,
              whiteSpace: 'nowrap',
            }}
          >
            <BsCircleFill size={8} style={{ color: filterItem.color }} />
            <span style={{ fontSize: '14px', fontWeight: 500 }}>{filterItem.label}</span>
            <span style={{ 
              fontSize: '12px', 
              fontWeight: 600,
              color: colors.textMuted,
            }}>
              {filterItem.count}
            </span>
          </motion.button>
        ))}
      </motion.div>

      {/* Camera Grid/List */}
      {isLoading && cameras.length === 0 ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px 20px',
          color: colors.textSecondary,
        }}>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <HiOutlineRefresh size={32} />
          </motion.div>
          <p style={{ marginTop: '12px' }}>Loading cameras...</p>
        </div>
      ) : error ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px 20px',
          color: colors.textSecondary,
        }}>
          <HiOutlineExclamationCircle size={48} color="#ef4444" />
          <p style={{ marginTop: '12px', color: '#ef4444' }}>{error}</p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onRefresh}
            style={{
              marginTop: '16px',
              padding: '10px 20px',
              borderRadius: '12px',
              background: colors.accent,
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Retry
          </motion.button>
        </div>
      ) : filteredCameras.length === 0 ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px 20px',
          color: colors.textSecondary,
        }}>
          <HiOutlineSearch size={48} style={{ opacity: 0.5, marginBottom: '12px' }} />
          <p style={{ fontWeight: 500 }}>
            {searchQuery || filter !== 'all' ? 'No cameras match your filters' : 'No cameras found'}
          </p>
          {(searchQuery || filter !== 'all') && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setSearchQuery('');
                setFilter('all');
              }}
              style={{
                marginTop: '16px',
                padding: '10px 20px',
                borderRadius: '12px',
                background: `${colors.accent}15`,
                border: `1px solid ${colors.accent}40`,
                cursor: 'pointer',
                color: colors.accent,
                fontWeight: 500,
              }}
            >
              Clear filters
            </motion.button>
          )}
        </div>
      ) : (
        <div style={{
          display: viewMode === 'grid' ? 'grid' : 'flex',
          gridTemplateColumns: viewMode === 'grid' ? 'repeat(2, 1fr)' : undefined,
          flexDirection: viewMode === 'list' ? 'column' : undefined,
          gap: '12px',
        }}>
        {filteredCameras.map((camera, index) => {
          const status = getCameraDisplayStatus(camera, recordingCameraIds);
          const locationStr = getCameraLocationString(camera);
          
          return (
          <motion.div
            key={camera.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + index * 0.05 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelectCamera(camera)}
            style={{ cursor: 'pointer' }}
          >
            <GlassCard padding="0" borderRadius="20px" style={{ overflow: 'hidden' }}>
              <div style={{ 
                position: 'relative', 
                height: viewMode === 'grid' ? '120px' : '180px',
              }}>
                {/* Live stream thumbnail preview */}
                <CameraThumbnail 
                  camera={camera} 
                  isOffline={status === 'offline'} 
                  height={viewMode === 'grid' ? 120 : 180}
                />
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'linear-gradient(180deg, rgba(0,0,0,0.3) 0%, transparent 30%, transparent 60%, rgba(0,0,0,0.7) 100%)',
                }} />
                
                {/* Status Badge */}
                <div style={{
                  position: 'absolute',
                  top: '10px',
                  left: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 10px',
                  borderRadius: '12px',
                  background: status === 'live' 
                    ? 'rgba(34, 197, 94, 0.9)'
                    : status === 'recording'
                    ? 'rgba(239, 68, 68, 0.9)'
                    : 'rgba(107, 114, 128, 0.9)',
                  backdropFilter: 'blur(10px)',
                }}>
                  {status === 'recording' ? (
                    <BsRecordCircle size={10} color="#fff" />
                  ) : (
                    <BsCircleFill size={6} color="#fff" />
                  )}
                  <span style={{ 
                    fontSize: '10px', 
                    fontWeight: 600, 
                    color: '#fff',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}>
                    {status}
                  </span>
                </div>
                
                {/* Camera Info */}
                <div style={{
                  position: 'absolute',
                  bottom: '10px',
                  left: '12px',
                  right: '12px',
                }}>
                  <div style={{ 
                    fontSize: viewMode === 'grid' ? '14px' : '16px', 
                    fontWeight: 600, 
                    color: '#fff',
                    marginBottom: '2px',
                  }}>
                    {camera.name}
                  </div>
                  <div style={{ 
                    fontSize: '11px', 
                    color: 'rgba(255,255,255,0.8)',
                  }}>
                    {locationStr}
                    {camera.fps && ` • ${camera.fps} FPS`}
                  </div>
                </div>
              </div>
            </GlassCard>
          </motion.div>
          );
        })}
        </div>
      )}
    </div>
  );
};

const CameraDetail: React.FC<{ 
  camera: CameraResponse;
  cameras: CameraResponse[]; 
  recordingCameraIds: ReadonlySet<string>;
  onBack: () => void;
  onSelectCamera: (camera: CameraResponse) => void;
  onToggleRecording: (cameraId: string) => void;
}> = ({ camera, cameras, recordingCameraIds, onBack, onSelectCamera, onToggleRecording }) => {
  const { colors, preferences } = useTheme();
  const navigate = useNavigate();
  const isDark = preferences.mode === 'dark';
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showPTZControls, setShowPTZControls] = useState(false);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const currentIndex = cameras.findIndex(c => c.id === camera.id);
  const status = getCameraDisplayStatus(camera, recordingCameraIds);
  const isRecording = recordingCameraIds.has(camera.id);

  // Use the video stream hook for snapshot functionality
  const { frameUrl } = useVideoStream({ camera, autoConnect: true });

  const handlePrevCamera = () => {
    if (currentIndex > 0) {
      onSelectCamera(cameras[currentIndex - 1]);
    }
  };

  const handleNextCamera = () => {
    if (currentIndex < cameras.length - 1) {
      onSelectCamera(cameras[currentIndex + 1]);
    }
  };

  // Fullscreen toggle
  const handleFullscreen = async () => {
    if (!videoContainerRef.current) return;
    
    try {
      if (!isFullscreen) {
        if (videoContainerRef.current.requestFullscreen) {
          await videoContainerRef.current.requestFullscreen();
        } else if ((videoContainerRef.current as any).webkitRequestFullscreen) {
          await (videoContainerRef.current as any).webkitRequestFullscreen();
        }
        setIsFullscreen(true);
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        }
        setIsFullscreen(false);
      }
    } catch (err) {
      console.error('Fullscreen error:', err);
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Snapshot handler
  const handleSnapshot = () => {
    if (!frameUrl) {
      alert('No frame available to capture');
      return;
    }
    
    // Create a temporary link to download the current frame
    const link = document.createElement('a');
    link.href = frameUrl;
    link.download = `${camera.name}_snapshot_${new Date().toISOString().replace(/[:.]/g, '-')}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Show feedback
    const feedback = document.createElement('div');
    feedback.innerText = '📸 Snapshot saved!';
    feedback.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,0.8);color:white;padding:20px 40px;border-radius:12px;font-size:18px;z-index:9999;';
    document.body.appendChild(feedback);
    setTimeout(() => feedback.remove(), 1500);
  };

  // Recording handler
  const handleRecording = () => {
    onToggleRecording(camera.id);
  };

  // Settings handler - navigate to camera management
  const handleSettings = () => {
    navigate(`/cameras?edit=${camera.id}`);
  };

  // Share handler - navigate to members page with camera pre-selected
  const handleShare = () => {
    navigate(`/members?share=${camera.id}`);
  };

  // Download handler
  const handleDownload = () => {
    // This would typically show a modal to select recording timeframe
    alert(`Download feature: Select recordings for "${camera.name}" to download.`);
  };

  // PTZ handler
  const handlePTZ = () => {
    if (camera.camera_type !== 'ptz') {
      alert('PTZ controls are only available for PTZ cameras');
      return;
    }
    setShowPTZControls(!showPTZControls);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#000',
    }}>
      {/* Video Container */}
      <div 
        ref={videoContainerRef}
        style={{
        position: 'relative',
        width: '100%',
        height: '60vh',
        minHeight: '300px',
      }}>
        {/* Live Stream Player */}
        <LiveStreamPlayer
          camera={camera}
          autoPlay={isPlaying}
          showControls={false}
          showOverlay={false}
          aspectRatio="auto"
          style={{ width: '100%', height: '100%', borderRadius: 0 }}
        />
        
        {/* Top Controls */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          padding: '50px 20px 20px',
          background: 'linear-gradient(180deg, rgba(0,0,0,0.7) 0%, transparent 100%)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onBack}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)',
              backdropFilter: 'blur(10px)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#fff',
            }}
          >
            <HiOutlineArrowLeft size={20} />
          </motion.button>
          
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              fontSize: '16px', 
              fontWeight: 600, 
              color: '#fff',
            }}>
              {camera.name}
            </div>
            <div style={{ 
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              fontSize: '12px',
              color: 'rgba(255,255,255,0.8)',
            }}>
              <BsCircleFill size={6} color={status === 'live' ? '#22c55e' : status === 'recording' ? '#ef4444' : '#6b7280'} />
              {status.toUpperCase()}
            </div>
          </div>
          
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)',
              backdropFilter: 'blur(10px)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#fff',
            }}
          >
            <HiOutlineDotsVertical size={20} />
          </motion.button>
        </div>
        
        {/* Live Badge */}
        {status !== 'offline' && (
          <motion.div
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{
              position: 'absolute',
              top: '100px',
              right: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '8px',
              background: status === 'recording' ? 'rgba(239, 68, 68, 0.9)' : 'rgba(34, 197, 94, 0.9)',
            }}
          >
            <BsRecordCircle size={12} color="#fff" />
            <span style={{ 
              fontSize: '12px', 
              fontWeight: 700, 
              color: '#fff',
            }}>
              {status === 'recording' ? 'REC' : 'LIVE'}
            </span>
          </motion.div>
        )}
        
        {/* Play/Pause Overlay */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsPlaying(!isPlaying)}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '70px',
            height: '70px',
            borderRadius: '50%',
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(10px)',
            border: '2px solid rgba(255,255,255,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#fff',
          }}
        >
          {isPlaying ? <HiOutlinePause size={32} /> : <HiOutlinePlay size={32} />}
        </motion.button>
        
        {/* Navigation Arrows */}
        {currentIndex > 0 && (
          <motion.button
            whileHover={{ scale: 1.1, x: -4 }}
            whileTap={{ scale: 0.9 }}
            onClick={handlePrevCamera}
            style={{
              position: 'absolute',
              left: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'rgba(0,0,0,0.3)',
              backdropFilter: 'blur(10px)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#fff',
            }}
          >
            <HiOutlineChevronLeft size={24} />
          </motion.button>
        )}
        
        {currentIndex < cameras.length - 1 && (
          <motion.button
            whileHover={{ scale: 1.1, x: 4 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleNextCamera}
            style={{
              position: 'absolute',
              right: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'rgba(0,0,0,0.3)',
              backdropFilter: 'blur(10px)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#fff',
            }}
          >
            <HiOutlineChevronRight size={24} />
          </motion.button>
        )}
        
        {/* Bottom Controls */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '20px',
          background: 'linear-gradient(0deg, rgba(0,0,0,0.8) 0%, transparent 100%)',
        }}>
          {/* Time */}
          <div style={{ 
            fontSize: '14px', 
            color: '#fff',
            marginBottom: '12px',
            textAlign: 'center',
          }}>
            {new Date().toLocaleTimeString()}
          </div>
          
          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '16px',
          }}>
            {[
              { icon: <HiOutlinePhotograph size={22} />, label: 'Snapshot', onClick: handleSnapshot },
              { 
                icon: isRecording ? <HiOutlineStop size={22} /> : <BsRecordCircle size={22} />, 
                label: isRecording ? 'Stop' : 'Record', 
                onClick: handleRecording,
                active: isRecording,
              },
              { 
                icon: isMuted ? <HiOutlineVolumeOff size={22} /> : <HiOutlineVolumeUp size={22} />, 
                label: isMuted ? 'Unmute' : 'Mute', 
                onClick: () => setIsMuted(!isMuted),
              },
              { 
                icon: isFullscreen ? <RiFullscreenExitLine size={22} /> : <RiFullscreenLine size={22} />, 
                label: isFullscreen ? 'Exit' : 'Fullscreen', 
                onClick: handleFullscreen,
              },
            ].map((action, index) => (
              <motion.button
                key={index}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={action.onClick}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#fff',
                }}
              >
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: (action as any).active ? 'rgba(239, 68, 68, 0.8)' : 'rgba(255,255,255,0.15)',
                  backdropFilter: 'blur(10px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {action.icon}
                </div>
                <span style={{ fontSize: '11px' }}>{action.label}</span>
              </motion.button>
            ))}
          </div>
        </div>
      </div>
      
      {/* Bottom Panel */}
      <div style={{
        background: isDark ? '#0a0a1a' : '#fff',
        borderTopLeftRadius: '24px',
        borderTopRightRadius: '24px',
        padding: '24px 20px 100px',
        marginTop: '-20px',
        position: 'relative',
        zIndex: 10,
      }}>
        <div style={{
          width: '40px',
          height: '4px',
          background: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)',
          borderRadius: '2px',
          margin: '0 auto 20px',
        }} />
        
        <h3 style={{ 
          fontSize: '18px', 
          fontWeight: 600, 
          color: colors.text,
          marginBottom: '16px',
        }}>
          Quick Actions
        </h3>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '12px',
        }}>
          {[
            { icon: <HiOutlineZoomIn size={20} />, label: 'PTZ', color: '#3b82f6', onClick: handlePTZ },
            { icon: <HiOutlineAdjustments size={20} />, label: 'Settings', color: '#8b5cf6', onClick: handleSettings },
            { icon: <HiOutlineCloudDownload size={20} />, label: 'Download', color: '#22c55e', onClick: handleDownload },
            { icon: <HiOutlineShare size={20} />, label: 'Share', color: '#f59e0b', onClick: handleShare },
          ].map((action, index) => (
            <motion.button
              key={index}
              whileHover={{ scale: 1.05, y: -4 }}
              whileTap={{ scale: 0.95 }}
              onClick={action.onClick}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                padding: '16px 8px',
                borderRadius: '16px',
                border: 'none',
                background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                cursor: 'pointer',
                color: action.color,
              }}
            >
              {action.icon}
              <span style={{ 
                fontSize: '11px', 
                fontWeight: 600,
                color: colors.text,
              }}>
                {action.label}
              </span>
            </motion.button>
          ))}
        </div>

        {/* PTZ Controls Modal */}
        <AnimatePresence>
          {showPTZControls && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              style={{
                marginTop: '16px',
                padding: '20px',
                borderRadius: '16px',
                background: isDark ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
              }}
            >
              <div style={{ textAlign: 'center', marginBottom: '16px', color: colors.text, fontWeight: 600 }}>
                PTZ Controls
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', maxWidth: '180px', margin: '0 auto' }}>
                <div />
                <motion.button whileTap={{ scale: 0.9 }} style={{ padding: '12px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>▲</motion.button>
                <div />
                <motion.button whileTap={{ scale: 0.9 }} style={{ padding: '12px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>◀</motion.button>
                <motion.button whileTap={{ scale: 0.9 }} style={{ padding: '12px', background: '#6b7280', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '10px' }}>HOME</motion.button>
                <motion.button whileTap={{ scale: 0.9 }} style={{ padding: '12px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>▶</motion.button>
                <div />
                <motion.button whileTap={{ scale: 0.9 }} style={{ padding: '12px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>▼</motion.button>
                <div />
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '16px' }}>
                <motion.button whileTap={{ scale: 0.9 }} style={{ padding: '8px 16px', background: '#22c55e', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Zoom +</motion.button>
                <motion.button whileTap={{ scale: 0.9 }} style={{ padding: '8px 16px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Zoom -</motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Camera Info */}
        <GlassCard padding="16px" borderRadius="16px" style={{ marginTop: '20px' }}>
          <h4 style={{ 
            fontSize: '14px', 
            fontWeight: 600, 
            color: colors.text,
            marginBottom: '12px',
          }}>
            Camera Details
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              { label: 'Resolution', value: camera.resolution || 'Unknown' },
              { label: 'Frame Rate', value: camera.fps ? `${camera.fps} FPS` : 'Unknown' },
              { label: 'Location', value: getCameraLocationString(camera) },
              { label: 'Status', value: status.charAt(0).toUpperCase() + status.slice(1) },
            ].map((detail, index) => (
              <div key={index} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', color: colors.textMuted }}>{detail.label}</span>
                <span style={{ fontSize: '13px', fontWeight: 600, color: colors.text }}>{detail.value}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

export const MonitoringPageNew: React.FC = () => {
  const [cameras, setCameras] = useState<CameraResponse[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<CameraResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recordingCameraIds, setRecordingCameraIds] = useState<ReadonlySet<string>>(new Set());

  const fetchCameras = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [cameraList, activeStreams] = await Promise.all([
        camerasApi.listCameras(),
        streamingApi.listActiveStreams().catch(() => ({ count: 0, streams: [] })),
      ]);

      setCameras(cameraList);
      setRecordingCameraIds(new Set(activeStreams.streams.map(s => s.camera_id)));
    } catch (err) {
      console.error('Failed to fetch cameras:', err);
      setError(err instanceof Error ? err.message : 'Failed to load cameras');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCameras();
  }, [fetchCameras]);

  const handleSelectCamera = (camera: CameraResponse) => {
    setSelectedCamera(camera);
  };

  const handleBack = () => {
    setSelectedCamera(null);
  };

  const handleToggleRecording = async (cameraId: string) => {
    const isCurrentlyRecording = recordingCameraIds.has(cameraId);
    const camera = cameras.find(c => c.id === cameraId);
    
    try {
      if (isCurrentlyRecording) {
        // Stop recording
        await streamingApi.stopStream(cameraId);
        setRecordingCameraIds(prev => {
          const next = new Set(prev);
          next.delete(cameraId);
          return next;
        });
      } else {
        // Start recording
        if (!camera) {
          throw new Error('Camera not found');
        }
        await streamingApi.startStream({
          camera_id: cameraId,
          stream_url: camera.stream_url,
          config: {
            fps: camera.fps || 15,
          },
        });
        setRecordingCameraIds(prev => {
          const next = new Set(Array.from(prev));
          next.add(cameraId);
          return next;
        });
      }
    } catch (err) {
      console.error('Failed to toggle recording:', err);
      alert(`Failed to ${isCurrentlyRecording ? 'stop' : 'start'} recording: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  return (
    <AnimatePresence mode="wait">
      {selectedCamera ? (
        <motion.div
          key="detail"
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -100 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          <CameraDetail 
            camera={selectedCamera}
            cameras={cameras}
            recordingCameraIds={recordingCameraIds}
            onBack={handleBack}
            onSelectCamera={handleSelectCamera}
            onToggleRecording={handleToggleRecording}
          />
        </motion.div>
      ) : (
        <motion.div
          key="grid"
          initial={{ opacity: 0, x: -100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 100 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          <CameraGrid 
            cameras={cameras}
            recordingCameraIds={recordingCameraIds}
            isLoading={isLoading}
            error={error}
            onRefresh={fetchCameras}
            onSelectCamera={handleSelectCamera}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};
