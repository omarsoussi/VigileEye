import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { GlassCard, AnimatedButton } from '../../components/GlassCard';
import { CameraWithPermission } from '../../services/api';
import { useVideoStream } from '../../hooks/useVideoStream';
import { useAllCameras } from '../../hooks/useAllCameras';
import { getCameraImage, getCameraLocationString, defaultCameras } from '../../data/cameraData';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  CartesianGrid
} from 'recharts';
import { 
  HiOutlineSearch, 
  HiOutlineBell,
  HiOutlineShieldCheck,
  HiOutlineVideoCamera,
  HiOutlineExclamationCircle,
  HiOutlineChartBar,
  HiOutlineLightningBolt,
  HiOutlineEye,
  HiOutlineClock,
  HiOutlineWifi,
  HiOutlineRefresh,
  HiOutlineStatusOnline,
  HiOutlineServer,
  HiOutlineChip,
  HiOutlinePlay,
} from 'react-icons/hi';
import { 
  RiShieldCheckLine, 
  RiAlertLine,
  RiCameraLine,
  RiWifiLine,
  RiSignalWifiFill,
  RiSignalWifi3Fill,
  RiSignalWifi2Fill,
  RiSignalWifi1Fill,
  RiSignalWifiOffFill,
} from 'react-icons/ri';
import { BsCircleFill, BsChevronRight, BsSpeedometer2, BsGraphUp, BsActivity } from 'react-icons/bs';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtext?: string;
  color: string;
  onClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, subtext, color, onClick }) => {
  const { colors, preferences } = useTheme();
  
  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -4 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <GlassCard padding="16px" borderRadius="20px">
        <div style={{ 
          width: '40px', 
          height: '40px', 
          borderRadius: '12px',
          background: `${color}20`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '12px',
          color: color,
        }}>
          {icon}
        </div>
        <div style={{ 
          fontSize: '28px', 
          fontWeight: 700, 
          color: colors.text,
          marginBottom: '2px',
          letterSpacing: '-1px',
        }}>
          {value}
        </div>
        <div style={{ 
          fontSize: '13px', 
          color: colors.textSecondary,
          fontWeight: 500,
        }}>
          {label}
        </div>
        {subtext && (
          <div style={{ 
            fontSize: '11px', 
            color: color,
            fontWeight: 600,
            marginTop: '4px',
          }}>
            {subtext}
          </div>
        )}
      </GlassCard>
    </motion.div>
  );
};

interface CameraPreviewProps {
  camera: CameraWithPermission;
}

const CameraPreview: React.FC<CameraPreviewProps> = ({ camera }) => {
  const { id, name, status, camera_type, is_active, isShared, permission } = camera;
  const location = getCameraLocationString(camera);
  const image = getCameraImage(camera_type);
  const displayStatus = is_active && status === 'online' ? 'live' : 'offline';
  const navigate = useNavigate();
  const { colors, preferences } = useTheme();
  const isDark = preferences.mode === 'dark';
  const { frameUrl, connectionState, isStreaming } = useVideoStream({
    camera,
    autoConnect: displayStatus === 'live',
  });
  
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => navigate(`/monitoring/${id}`)}
      style={{ cursor: 'pointer' }}
    >
      <GlassCard padding="0" borderRadius="20px" style={{ overflow: 'hidden' }}>
        <div style={{ position: 'relative', height: '120px' }}>
          <img 
            src={frameUrl || image}
            alt={name}
            style={{ 
              width: '100%', 
              height: '100%', 
              objectFit: 'cover',
            }}
          />
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.7) 100%)',
          }} />
          
          {/* Status Badge */}
          <div style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: '12px',
            background: displayStatus === 'live' 
              ? 'rgba(34, 197, 94, 0.9)'
              : 'rgba(239, 68, 68, 0.9)',
            backdropFilter: 'blur(10px)',
          }}>
            {displayStatus === 'live' && isStreaming && (
              <motion.div
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              >
                <BsCircleFill size={6} color="#fff" />
              </motion.div>
            )}
            {displayStatus !== 'live' || !isStreaming ? (
              <BsCircleFill size={6} color="#fff" />
            ) : null}
            <span style={{ 
              fontSize: '11px', 
              fontWeight: 600, 
              color: '#fff',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>
              {displayStatus === 'live'
                ? (isStreaming ? 'LIVE' : (connectionState === 'connecting' ? 'CONNECTING' : 'LIVE'))
                : 'OFFLINE'}
            </span>
          </div>

          {/* Shared badge */}
          {isShared && (
            <div style={{
              position: 'absolute',
              top: '10px',
              left: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 8px',
              borderRadius: '10px',
              background: permission === 'editor' ? 'rgba(99,102,241,0.85)' : 'rgba(107,114,128,0.85)',
              backdropFilter: 'blur(10px)',
              fontSize: '10px',
              fontWeight: 600,
              color: '#fff',
              textTransform: 'uppercase',
              letterSpacing: '0.3px',
            }}>
              {permission === 'editor' ? 'Editor' : 'Shared'}
            </div>
          )}

          {/* Play button overlay when not streaming */}
          {displayStatus === 'live' && !isStreaming && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)',
                backdropFilter: 'blur(5px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <HiOutlinePlay size={20} color="#fff" />
            </motion.div>
          )}
          
          {/* Camera Info */}
          <div style={{
            position: 'absolute',
            bottom: '10px',
            left: '12px',
            right: '12px',
          }}>
            <div style={{ 
              fontSize: '14px', 
              fontWeight: 600, 
              color: '#fff',
              marginBottom: '2px',
            }}>
              {name}
            </div>
            <div style={{ 
              fontSize: '11px', 
              color: 'rgba(255,255,255,0.8)',
            }}>
              {location}
            </div>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
};

interface AlertItemProps {
  type: 'warning' | 'danger' | 'info';
  title: string;
  time: string;
  location: string;
}

const AlertItem: React.FC<AlertItemProps> = ({ type, title, time, location }) => {
  const { colors, preferences } = useTheme();
  const isDark = preferences.mode === 'dark';
  
  const typeColors = {
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#3b82f6',
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ x: 4 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px',
        borderRadius: '16px',
        background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
        cursor: 'pointer',
      }}
    >
      <div style={{
        width: '40px',
        height: '40px',
        borderRadius: '12px',
        background: `${typeColors[type]}15`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: typeColors[type],
      }}>
        <RiAlertLine size={20} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ 
          fontSize: '14px', 
          fontWeight: 600, 
          color: colors.text,
          marginBottom: '2px',
        }}>
          {title}
        </div>
        <div style={{ 
          fontSize: '12px', 
          color: colors.textMuted,
        }}>
          {location} • {time}
        </div>
      </div>
      <BsChevronRight size={16} style={{ color: colors.textMuted }} />
    </motion.div>
  );
};

export const DashboardPageNew: React.FC = () => {
  const navigate = useNavigate();
  const { colors, preferences } = useTheme();
  const { user } = useAuth();
  const isDark = preferences.mode === 'dark';
  const [isMobile, setIsMobile] = useState(false);
  const { cameras, isLoading: camerasLoading } = useAllCameras();
  
  // Connection quality state
  const [connectionQuality, setConnectionQuality] = useState<{
    speed: number; // Mbps
    latency: number; // ms
    quality: 'excellent' | 'good' | 'fair' | 'poor' | 'offline';
    lastChecked: Date;
  }>({
    speed: 0,
    latency: 0,
    quality: 'good',
    lastChecked: new Date(),
  });
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  // Simulate connection speed test
  const testConnection = useCallback(async () => {
    setIsTestingConnection(true);
    
    // Simulate network test
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Generate realistic values
    const speed = Math.round(20 + Math.random() * 80); // 20-100 Mbps
    const latency = Math.round(10 + Math.random() * 90); // 10-100ms
    
    let quality: typeof connectionQuality.quality;
    if (speed >= 50 && latency <= 30) quality = 'excellent';
    else if (speed >= 25 && latency <= 50) quality = 'good';
    else if (speed >= 10 && latency <= 80) quality = 'fair';
    else quality = 'poor';
    
    setConnectionQuality({
      speed,
      latency,
      quality,
      lastChecked: new Date(),
    });
    setIsTestingConnection(false);
  }, []);

  // Test connection on mount
  useEffect(() => {
    testConnection();
  }, []);

  // Calculate if connection is suitable for camera monitoring
  const connectionSuitability = useMemo(() => {
    const onlineCameras = cameras.filter(c => c.status === 'online' && c.is_active).length;
    const requiredBandwidth = onlineCameras * 4; // Assume 4Mbps per camera
    const hasEnoughBandwidth = connectionQuality.speed >= requiredBandwidth;
    const hasLowLatency = connectionQuality.latency <= 100;
    
    return {
      camerasSupported: Math.floor(connectionQuality.speed / 4),
      onlineCameras,
      isSuitable: hasEnoughBandwidth && hasLowLatency,
      warning: !hasEnoughBandwidth 
        ? `Your connection may struggle with ${onlineCameras} cameras` 
        : connectionQuality.latency > 100 
        ? 'High latency may cause stream delays'
        : null,
    };
  }, [cameras, connectionQuality]);

  const getConnectionIcon = () => {
    switch (connectionQuality.quality) {
      case 'excellent': return <RiSignalWifiFill size={20} />;
      case 'good': return <RiSignalWifi3Fill size={20} />;
      case 'fair': return <RiSignalWifi2Fill size={20} />;
      case 'poor': return <RiSignalWifi1Fill size={20} />;
      default: return <RiSignalWifiOffFill size={20} />;
    }
  };

  const getConnectionColor = () => {
    switch (connectionQuality.quality) {
      case 'excellent': return '#22c55e';
      case 'good': return '#3b82f6';
      case 'fair': return '#f59e0b';
      case 'poor': return '#ef4444';
      default: return '#6b7280';
    }
  };

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const [greeting] = useState(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  });

  const alerts: AlertItemProps[] = [
    { type: 'warning', title: 'Motion Detected', time: '2 min ago', location: 'Front Door' },
    { type: 'danger', title: 'Camera Offline', time: '15 min ago', location: 'Garage' },
    { type: 'info', title: 'Person Detected', time: '1 hour ago', location: 'Backyard' },
  ];

  const containerStyle: React.CSSProperties = {
    minHeight: '100vh',
    padding: isMobile ? 'clamp(16px, 3vw, 24px)' : 'clamp(24px, 4vw, 48px)',
    paddingTop: isMobile ? 'max(60px, clamp(16px, 3vw, 24px))' : 'max(80px, clamp(24px, 4vw, 48px))',
    paddingBottom: isMobile ? 'clamp(100px, 20vh, 150px)' : 'clamp(80px, 15vh, 120px)',
    width: '100%',
    margin: '0 auto',
    maxWidth: isMobile ? '100%' : 'clamp(800px, 90vw, 1400px)',
  };

  const statsGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
    gap: isMobile ? '12px' : '20px',
    marginBottom: isMobile ? '16px' : '24px',
  };

  const actionGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: isMobile ? 'repeat(4, 1fr)' : 'repeat(4, 1fr)',
    gap: isMobile ? '10px' : '16px',
    marginTop: '16px',
  };

  return (
    <div style={containerStyle}>
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: isMobile ? '20px' : '32px',
        }}
      >
        <div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            style={{
              fontSize: isMobile ? '13px' : '14px',
              color: colors.textSecondary,
              marginBottom: '4px',
            }}
          >
            {greeting} 👋
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            style={{
              fontSize: isMobile ? '24px' : '32px',
              fontWeight: 700,
              color: colors.text,
              letterSpacing: '-0.5px',
            }}
          >
            Welcome, {user?.username || 'User'}
          </motion.h1>
        </div>
        
        <div style={{ display: 'flex', gap: '8px' }}>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            style={{
              width: isMobile ? '40px' : '44px',
              height: isMobile ? '40px' : '44px',
              borderRadius: '50%',
              background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: colors.text,
            }}
          >
            <HiOutlineSearch size={isMobile ? 18 : 22} />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate('/alerts')}
            style={{
              width: isMobile ? '40px' : '44px',
              height: isMobile ? '40px' : '44px',
              borderRadius: '50%',
              background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: colors.text,
              position: 'relative',
            }}
          >
            <HiOutlineBell size={isMobile ? 18 : 22} />
            <span style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              width: '8px',
              height: '8px',
              background: '#ef4444',
              borderRadius: '50%',
            }} />
          </motion.button>
        </div>
      </motion.div>

      {/* Security Status */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        style={{ marginBottom: isMobile ? '16px' : '20px' }}
      >
        <GlassCard 
          variant="elevated" 
          padding={isMobile ? '16px' : '20px'} 
          borderRadius="24px"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '12px' : '16px' }}>
            <motion.div
              animate={{ 
                scale: [1, 1.1, 1],
                boxShadow: [
                  '0 0 0 0 rgba(34, 197, 94, 0.4)',
                  '0 0 0 15px rgba(34, 197, 94, 0)',
                  '0 0 0 0 rgba(34, 197, 94, 0)',
                ]
              }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{
                width: isMobile ? '50px' : '60px',
                height: isMobile ? '50px' : '60px',
                borderRadius: '20px',
                background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <RiShieldCheckLine size={isMobile ? 24 : 32} color="#fff" />
            </motion.div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ 
                fontSize: isMobile ? '16px' : '20px', 
                fontWeight: 700, 
                color: colors.text,
                marginBottom: '4px',
              }}>
                System Protected
              </div>
              <div style={{ 
                fontSize: isMobile ? '12px' : '13px', 
                color: colors.textSecondary,
              }}>
                All cameras online • No threats detected
              </div>
            </div>
            {!isMobile && <BsChevronRight size={20} style={{ color: colors.textMuted }} />}
          </div>
        </GlassCard>
      </motion.div>

      {/* Connection Quality Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.17 }}
        style={{ marginBottom: isMobile ? '16px' : '20px' }}
      >
        <GlassCard padding={isMobile ? '14px' : '18px'} borderRadius="20px">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: `${getConnectionColor()}20`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: getConnectionColor(),
              }}>
                {isTestingConnection ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    <HiOutlineRefresh size={18} />
                  </motion.div>
                ) : (
                  getConnectionIcon()
                )}
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: colors.text }}>
                  Connection Quality
                </div>
                <div style={{ 
                  fontSize: '12px', 
                  color: getConnectionColor(),
                  fontWeight: 600,
                  textTransform: 'capitalize',
                }}>
                  {isTestingConnection ? 'Testing...' : connectionQuality.quality}
                </div>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={testConnection}
              disabled={isTestingConnection}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '10px',
                background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: isTestingConnection ? 'not-allowed' : 'pointer',
                color: colors.textMuted,
              }}
            >
              <HiOutlineRefresh size={16} />
            </motion.button>
          </div>

          {/* Connection Stats */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '10px',
            padding: '12px',
            background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
            borderRadius: '12px',
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginBottom: '4px' }}>
                <BsSpeedometer2 size={14} color={colors.textMuted} />
              </div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: colors.text }}>
                {connectionQuality.speed}
              </div>
              <div style={{ fontSize: '10px', color: colors.textMuted }}>Mbps</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginBottom: '4px' }}>
                <BsActivity size={14} color={colors.textMuted} />
              </div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: colors.text }}>
                {connectionQuality.latency}
              </div>
              <div style={{ fontSize: '10px', color: colors.textMuted }}>ms latency</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginBottom: '4px' }}>
                <RiCameraLine size={14} color={colors.textMuted} />
              </div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: connectionSuitability.isSuitable ? '#22c55e' : '#f59e0b' }}>
                {connectionSuitability.camerasSupported}
              </div>
              <div style={{ fontSize: '10px', color: colors.textMuted }}>cameras</div>
            </div>
          </div>

          {/* Warning if connection is not suitable */}
          {connectionSuitability.warning && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                marginTop: '10px',
                padding: '10px 12px',
                borderRadius: '10px',
                background: 'rgba(245, 158, 11, 0.15)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <HiOutlineExclamationCircle size={16} color="#f59e0b" />
              <span style={{ fontSize: '12px', color: '#f59e0b' }}>
                {connectionSuitability.warning}
              </span>
            </motion.div>
          )}

          {/* Suitability indicator */}
          {connectionSuitability.isSuitable && connectionSuitability.onlineCameras > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                marginTop: '10px',
                padding: '10px 12px',
                borderRadius: '10px',
                background: 'rgba(34, 197, 94, 0.15)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <HiOutlineStatusOnline size={16} color="#22c55e" />
              <span style={{ fontSize: '12px', color: '#22c55e' }}>
                Connection optimal for {connectionSuitability.onlineCameras} active cameras
              </span>
            </motion.div>
          )}
        </GlassCard>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        style={statsGridStyle}
      >
        <StatCard
          icon={<RiCameraLine size={isMobile ? 18 : 20} />}
          label="Active Cameras"
          value={cameras.filter(c => c.is_active).length}
          subtext={`${cameras.length} total`}
          color="#3b82f6"
          onClick={() => navigate('/monitoring')}
        />
        <StatCard
          icon={<RiAlertLine size={isMobile ? 18 : 20} />}
          label="Alerts Today"
          value="12"
          subtext="+3 new"
          color="#f59e0b"
          onClick={() => navigate('/alerts')}
        />
        <StatCard
          icon={<HiOutlineShieldCheck size={isMobile ? 18 : 20} />}
          label="Zones"
          value="4"
          subtext="All armed"
          color="#22c55e"
          onClick={() => navigate('/zones')}
        />
        <StatCard
          icon={<HiOutlineChartBar size={isMobile ? 18 : 20} />}
          label="Uptime"
          value="99.9%"
          subtext="This month"
          color="#8b5cf6"
          onClick={() => navigate('/analytics')}
        />
      </motion.div>

      {/* Analytics Charts Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.22 }}
        style={{ marginBottom: isMobile ? '20px' : '24px' }}
      >
        <h2 style={{ 
          fontSize: isMobile ? '16px' : '18px', 
          fontWeight: 600, 
          color: colors.text,
          marginBottom: '12px',
        }}>
          Analytics Overview
        </h2>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
          gap: isMobile ? '16px' : '20px',
        }}>
          {/* Camera Status Pie Chart */}
          <GlassCard padding={isMobile ? '16px' : '20px'} borderRadius="20px">
            <h3 style={{ 
              fontSize: '14px', 
              fontWeight: 600, 
              color: colors.text, 
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <HiOutlineVideoCamera size={18} color={colors.accent} />
              Camera Status
            </h3>
            <div style={{ height: isMobile ? '160px' : '180px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Online', value: cameras.filter(c => c.status === 'online').length, color: '#22c55e' },
                      { name: 'Recording', value: cameras.filter(c => c.is_active && c.status === 'online').length, color: '#3b82f6' },
                      { name: 'Offline', value: cameras.filter(c => c.status === 'offline').length, color: '#ef4444' },
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={isMobile ? 35 : 45}
                    outerRadius={isMobile ? 55 : 70}
                    paddingAngle={5}
                    dataKey="value"
                    animationBegin={300}
                    animationDuration={800}
                  >
                    {[
                      { name: 'Online', value: cameras.filter(c => c.status === 'online').length, color: '#22c55e' },
                      { name: 'Recording', value: cameras.filter(c => c.is_active).length, color: '#3b82f6' },
                      { name: 'Offline', value: cameras.filter(c => c.status === 'offline').length, color: '#ef4444' },
                    ].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{
                      background: isDark ? 'rgba(25, 25, 40, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                      border: 'none',
                      borderRadius: '12px',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                      color: colors.text,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '8px' }}>
              {[
                { label: 'Online', color: '#22c55e', count: cameras.filter(c => c.status === 'online').length },
                { label: 'Recording', color: '#3b82f6', count: cameras.filter(c => c.is_active).length },
                { label: 'Offline', color: '#ef4444', count: cameras.filter(c => c.status === 'offline').length },
              ].map((item, index) => (
                <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.color }} />
                  <span style={{ fontSize: '11px', color: colors.textMuted }}>{item.label}: {item.count}</span>
                </div>
              ))}
            </div>
          </GlassCard>

          {/* Top 5 Cameras by Intrusions */}
          <GlassCard padding={isMobile ? '16px' : '20px'} borderRadius="20px">
            <h3 style={{ 
              fontSize: '14px', 
              fontWeight: 600, 
              color: colors.text, 
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <RiAlertLine size={18} color="#f59e0b" />
              Top 5 Cameras (Intrusions)
            </h3>
            <div style={{ height: isMobile ? '160px' : '180px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    { name: 'Front Door', intrusions: 24, fill: '#f59e0b' },
                    { name: 'Backyard', intrusions: 18, fill: '#22c55e' },
                    { name: 'Garage', intrusions: 15, fill: '#3b82f6' },
                    { name: 'Parking', intrusions: 12, fill: '#8b5cf6' },
                    { name: 'Gate', intrusions: 8, fill: '#ec4899' },
                  ]}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} />
                  <XAxis type="number" tick={{ fill: colors.textMuted, fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" tick={{ fill: colors.textMuted, fontSize: 10 }} width={60} />
                  <Tooltip 
                    contentStyle={{
                      background: isDark ? 'rgba(25, 25, 40, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                      border: 'none',
                      borderRadius: '12px',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                      color: colors.text,
                    }}
                  />
                  <Bar 
                    dataKey="intrusions" 
                    radius={[0, 4, 4, 0]}
                    animationBegin={400}
                    animationDuration={800}
                  >
                    {[
                      { name: 'Front Door', intrusions: 24, fill: '#f59e0b' },
                      { name: 'Backyard', intrusions: 18, fill: '#22c55e' },
                      { name: 'Garage', intrusions: 15, fill: '#3b82f6' },
                      { name: 'Parking', intrusions: 12, fill: '#8b5cf6' },
                      { name: 'Gate', intrusions: 8, fill: '#ec4899' },
                    ].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>

          {/* Top 5 Zones by Intrusions */}
          <GlassCard padding={isMobile ? '16px' : '20px'} borderRadius="20px">
            <h3 style={{ 
              fontSize: '14px', 
              fontWeight: 600, 
              color: colors.text, 
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <HiOutlineShieldCheck size={18} color="#22c55e" />
              Top 5 Zones (Intrusions)
            </h3>
            <div style={{ height: isMobile ? '160px' : '180px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    { name: 'Zone A', intrusions: 32, fill: '#ef4444' },
                    { name: 'Zone B', intrusions: 28, fill: '#f59e0b' },
                    { name: 'Zone C', intrusions: 21, fill: '#22c55e' },
                    { name: 'Zone D', intrusions: 14, fill: '#3b82f6' },
                    { name: 'Zone E', intrusions: 9, fill: '#8b5cf6' },
                  ]}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} />
                  <XAxis type="number" tick={{ fill: colors.textMuted, fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" tick={{ fill: colors.textMuted, fontSize: 10 }} width={50} />
                  <Tooltip 
                    contentStyle={{
                      background: isDark ? 'rgba(25, 25, 40, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                      border: 'none',
                      borderRadius: '12px',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                      color: colors.text,
                    }}
                  />
                  <Bar 
                    dataKey="intrusions" 
                    radius={[0, 4, 4, 0]}
                    animationBegin={500}
                    animationDuration={800}
                  >
                    {[
                      { name: 'Zone A', intrusions: 32, fill: '#ef4444' },
                      { name: 'Zone B', intrusions: 28, fill: '#f59e0b' },
                      { name: 'Zone C', intrusions: 21, fill: '#22c55e' },
                      { name: 'Zone D', intrusions: 14, fill: '#3b82f6' },
                      { name: 'Zone E', intrusions: 9, fill: '#8b5cf6' },
                    ].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>
        </div>
      </motion.div>

      {/* Live Cameras */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        style={{ marginBottom: isMobile ? '20px' : '24px' }}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px',
        }}>
          <h2 style={{ 
            fontSize: isMobile ? '16px' : '18px', 
            fontWeight: 600, 
            color: colors.text,
          }}>
            Live Cameras
          </h2>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/monitoring')}
            style={{
              background: 'none',
              border: 'none',
              color: colors.accent,
              fontSize: isMobile ? '12px' : '14px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            View All <BsChevronRight size={isMobile ? 12 : 14} />
          </motion.button>
        </div>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
          gap: isMobile ? '12px' : '16px',
        }}>
          {camerasLoading ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '32px', color: colors.textSecondary }}>
              Loading cameras...
            </div>
          ) : cameras.slice(0, isMobile ? 4 : 6).map((camera, index) => (
            <motion.div
              key={camera.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + index * 0.1 }}
            >
              <CameraPreview camera={camera} />
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Recent Alerts */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        style={{ marginBottom: isMobile ? '20px' : '24px' }}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px',
        }}>
          <h2 style={{ 
            fontSize: isMobile ? '16px' : '18px', 
            fontWeight: 600, 
            color: colors.text,
          }}>
            Recent Alerts
          </h2>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/alerts')}
            style={{
              background: 'none',
              border: 'none',
              color: colors.accent,
              fontSize: isMobile ? '12px' : '14px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            View All <BsChevronRight size={isMobile ? 12 : 14} />
          </motion.button>
        </div>
        
        <GlassCard padding={isMobile ? '8px' : '12px'} borderRadius="20px">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {alerts.slice(0, isMobile ? 2 : 3).map((alert, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + index * 0.1 }}
              >
                <AlertItem {...alert} />
              </motion.div>
            ))}
          </div>
        </GlassCard>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <h2 style={{ 
          fontSize: isMobile ? '16px' : '18px', 
          fontWeight: 600, 
          color: colors.text,
          marginBottom: '12px',
        }}>
          Quick Actions
        </h2>
        
        <div style={actionGridStyle}>
          {[
            { icon: <HiOutlineLightningBolt size={isMobile ? 18 : 22} />, label: 'Arm All', color: '#22c55e' },
            { icon: <HiOutlineEye size={isMobile ? 18 : 22} />, label: 'View All', color: '#3b82f6' },
            { icon: <HiOutlineClock size={isMobile ? 18 : 22} />, label: 'History', color: '#8b5cf6' },
            { icon: <HiOutlineExclamationCircle size={isMobile ? 18 : 22} />, label: 'Panic', color: '#ef4444' },
          ].map((action, index) => (
            <motion.button
              key={index}
              whileHover={{ scale: 1.05, y: -4 }}
              whileTap={{ scale: 0.95 }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: isMobile ? '6px' : '8px',
                padding: isMobile ? '12px 8px' : '16px 8px',
                borderRadius: '16px',
                border: 'none',
                background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                cursor: 'pointer',
                color: action.color,
              }}
            >
              {action.icon}
              <span style={{ 
                fontSize: isMobile ? '10px' : '11px', 
                fontWeight: 600,
                color: colors.text,
                textAlign: 'center',
              }}>
                {action.label}
              </span>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* System Health */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55 }}
        style={{ marginTop: isMobile ? '20px' : '24px' }}
      >
        <h2 style={{ 
          fontSize: isMobile ? '16px' : '18px', 
          fontWeight: 600, 
          color: colors.text,
          marginBottom: '12px',
        }}>
          System Health
        </h2>
        
        <GlassCard padding={isMobile ? '14px' : '18px'} borderRadius="20px">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Storage */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <HiOutlineServer size={16} color={colors.textMuted} />
                  <span style={{ fontSize: '13px', fontWeight: 500, color: colors.text }}>Storage</span>
                </div>
                <span style={{ fontSize: '12px', color: colors.textMuted }}>245 GB / 500 GB</span>
              </div>
              <div style={{
                height: '8px',
                borderRadius: '4px',
                background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                overflow: 'hidden',
              }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: '49%' }}
                  transition={{ delay: 0.6, duration: 0.8, ease: 'easeOut' }}
                  style={{
                    height: '100%',
                    borderRadius: '4px',
                    background: 'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 100%)',
                  }}
                />
              </div>
            </div>

            {/* Recording Buffer */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <BsGraphUp size={14} color={colors.textMuted} />
                  <span style={{ fontSize: '13px', fontWeight: 500, color: colors.text }}>Recording Buffer</span>
                </div>
                <span style={{ fontSize: '12px', color: '#22c55e' }}>Healthy</span>
              </div>
              <div style={{
                height: '8px',
                borderRadius: '4px',
                background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                overflow: 'hidden',
              }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: '25%' }}
                  transition={{ delay: 0.7, duration: 0.8, ease: 'easeOut' }}
                  style={{
                    height: '100%',
                    borderRadius: '4px',
                    background: 'linear-gradient(90deg, #22c55e 0%, #16a34a 100%)',
                  }}
                />
              </div>
            </div>

            {/* CPU Usage */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <HiOutlineChip size={16} color={colors.textMuted} />
                  <span style={{ fontSize: '13px', fontWeight: 500, color: colors.text }}>Processing Load</span>
                </div>
                <span style={{ fontSize: '12px', color: colors.textMuted }}>32%</span>
              </div>
              <div style={{
                height: '8px',
                borderRadius: '4px',
                background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                overflow: 'hidden',
              }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: '32%' }}
                  transition={{ delay: 0.8, duration: 0.8, ease: 'easeOut' }}
                  style={{
                    height: '100%',
                    borderRadius: '4px',
                    background: 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)',
                  }}
                />
              </div>
            </div>
          </div>

          {/* System Status Summary */}
          <div style={{
            marginTop: '16px',
            padding: '12px',
            borderRadius: '12px',
            background: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid rgba(34, 197, 94, 0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '10px',
              background: 'rgba(34, 197, 94, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <HiOutlineStatusOnline size={18} color="#22c55e" />
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#22c55e' }}>
                All Systems Operational
              </div>
              <div style={{ fontSize: '11px', color: colors.textMuted }}>
                Last checked: {new Date().toLocaleTimeString()}
              </div>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Recent Activity Timeline */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        style={{ marginTop: isMobile ? '20px' : '24px', marginBottom: '20px' }}
      >
        <h2 style={{ 
          fontSize: isMobile ? '16px' : '18px', 
          fontWeight: 600, 
          color: colors.text,
          marginBottom: '12px',
        }}>
          Recent Activity
        </h2>
        
        <GlassCard padding={isMobile ? '14px' : '18px'} borderRadius="20px">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {[
              { time: '2 min ago', event: 'Motion detected at Front Door', type: 'motion', icon: <HiOutlineEye size={14} /> },
              { time: '15 min ago', event: 'Camera 3 went offline', type: 'warning', icon: <HiOutlineVideoCamera size={14} /> },
              { time: '1 hour ago', event: 'Recording started for Zone A', type: 'recording', icon: <BsCircleFill size={8} /> },
              { time: '2 hours ago', event: 'System backup completed', type: 'system', icon: <HiOutlineServer size={14} /> },
              { time: '3 hours ago', event: 'New device connected', type: 'info', icon: <HiOutlineWifi size={14} /> },
            ].map((activity, index) => (
              <div 
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '12px 0',
                  borderBottom: index < 4 ? `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}` : 'none',
                }}
              >
                {/* Timeline Dot */}
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '8px',
                  background: activity.type === 'warning' 
                    ? 'rgba(239, 68, 68, 0.15)' 
                    : activity.type === 'motion'
                    ? 'rgba(245, 158, 11, 0.15)'
                    : activity.type === 'recording'
                    ? 'rgba(239, 68, 68, 0.15)'
                    : 'rgba(59, 130, 246, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: activity.type === 'warning' 
                    ? '#ef4444' 
                    : activity.type === 'motion'
                    ? '#f59e0b'
                    : activity.type === 'recording'
                    ? '#ef4444'
                    : '#3b82f6',
                  flexShrink: 0,
                }}>
                  {activity.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: colors.text }}>
                    {activity.event}
                  </div>
                  <div style={{ fontSize: '11px', color: colors.textMuted, marginTop: '2px' }}>
                    {activity.time}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/alerts')}
            style={{
              width: '100%',
              marginTop: '12px',
              padding: '12px',
              borderRadius: '12px',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
              background: 'transparent',
              color: colors.accent,
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            View All Activity
            <BsChevronRight size={14} />
          </motion.button>
        </GlassCard>
      </motion.div>
    </div>
  );
};
