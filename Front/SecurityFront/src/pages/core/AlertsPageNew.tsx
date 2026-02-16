import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';
import { GlassCard } from '../../components/GlassCard';
import { 
  HiOutlineBell,
  HiOutlineCamera,
  HiOutlineExclamationCircle,
  HiOutlineInformationCircle,
  HiOutlineCheck,
  HiOutlineTrash,
  HiOutlineFilter,
  HiOutlineX,
} from 'react-icons/hi';
import { BsCircleFill, BsChevronRight } from 'react-icons/bs';
import { RiAlertLine, RiShieldCheckLine } from 'react-icons/ri';

interface Alert {
  id: string;
  type: 'motion' | 'person' | 'vehicle' | 'sound' | 'offline' | 'system';
  severity: 'high' | 'medium' | 'low' | 'info';
  title: string;
  description: string;
  location: string;
  time: string;
  isRead: boolean;
  thumbnail?: string;
}

const alerts: Alert[] = [
  { id: '1', type: 'motion', severity: 'high', title: 'Motion Detected', description: 'Unusual activity detected at front entrance', location: 'Front Door', time: '2 min ago', isRead: false, thumbnail: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200' },
  { id: '2', type: 'person', severity: 'high', title: 'Person Detected', description: 'Unknown person detected near garage', location: 'Garage', time: '15 min ago', isRead: false, thumbnail: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200' },
  { id: '3', type: 'offline', severity: 'medium', title: 'Camera Offline', description: 'Camera has lost connection', location: 'Backyard', time: '1 hour ago', isRead: true },
  { id: '4', type: 'vehicle', severity: 'low', title: 'Vehicle Detected', description: 'Car detected in driveway', location: 'Driveway', time: '2 hours ago', isRead: true, thumbnail: 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=200' },
  { id: '5', type: 'sound', severity: 'medium', title: 'Sound Alert', description: 'Loud noise detected', location: 'Living Room', time: '3 hours ago', isRead: true },
  { id: '6', type: 'system', severity: 'info', title: 'System Update', description: 'New firmware available for cameras', location: 'System', time: '1 day ago', isRead: true },
  { id: '7', type: 'motion', severity: 'low', title: 'Motion Detected', description: 'Small movement detected', location: 'Kitchen', time: '1 day ago', isRead: true },
];

const filterOptions = ['All', 'Motion', 'Person', 'Vehicle', 'Sound', 'System'];

export const AlertsPageNew: React.FC = () => {
  const { colors, preferences } = useTheme();
  const isDark = preferences.mode === 'dark';
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [alertsList, setAlertsList] = useState(alerts);
  const [expandedAlert, setExpandedAlert] = useState<string | null>(null);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#22c55e';
      default: return '#3b82f6';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'motion': return <HiOutlineCamera size={20} />;
      case 'person': return <RiAlertLine size={20} />;
      case 'vehicle': return <HiOutlineExclamationCircle size={20} />;
      case 'sound': return <HiOutlineBell size={20} />;
      case 'offline': return <HiOutlineX size={20} />;
      default: return <HiOutlineInformationCircle size={20} />;
    }
  };

  const markAsRead = (id: string) => {
    setAlertsList(prev => prev.map(alert => 
      alert.id === id ? { ...alert, isRead: true } : alert
    ));
  };

  const deleteAlert = (id: string) => {
    setAlertsList(prev => prev.filter(alert => alert.id !== id));
  };

  const markAllAsRead = () => {
    setAlertsList(prev => prev.map(alert => ({ ...alert, isRead: true })));
  };

  const filteredAlerts = alertsList.filter(alert => 
    selectedFilter === 'All' || alert.type.toLowerCase() === selectedFilter.toLowerCase()
  );

  const unreadCount = alertsList.filter(a => !a.isRead).length;

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
        <div>
          <h1 style={{
            fontSize: '32px',
            fontWeight: 700,
            color: colors.text,
            letterSpacing: '-0.5px',
          }}>
            Alerts
          </h1>
          <p style={{ 
            fontSize: '14px', 
            color: colors.textMuted,
            marginTop: '4px',
          }}>
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
          </p>
        </div>
        
        {unreadCount > 0 && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={markAllAsRead}
            style={{
              padding: '10px 16px',
              borderRadius: '12px',
              background: colors.accent,
              border: 'none',
              color: '#fff',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <HiOutlineCheck size={16} />
            Mark All Read
          </motion.button>
        )}
      </motion.div>

      {/* Summary Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <GlassCard 
          variant="elevated" 
          padding="20px" 
          borderRadius="24px"
          style={{ marginBottom: '20px' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <motion.div
              animate={unreadCount > 0 ? { 
                scale: [1, 1.1, 1],
              } : {}}
              transition={{ duration: 2, repeat: unreadCount > 0 ? Infinity : 0 }}
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '16px',
                background: unreadCount > 0 
                  ? 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)'
                  : 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {unreadCount > 0 ? (
                <HiOutlineBell size={28} color="#fff" />
              ) : (
                <RiShieldCheckLine size={28} color="#fff" />
              )}
            </motion.div>
            <div style={{ flex: 1 }}>
              <div style={{ 
                fontSize: '18px', 
                fontWeight: 700, 
                color: colors.text,
                marginBottom: '4px',
              }}>
                {unreadCount > 0 ? `${unreadCount} New Alerts` : 'All Clear'}
              </div>
              <div style={{ 
                fontSize: '13px', 
                color: colors.textSecondary,
              }}>
                {unreadCount > 0 
                  ? 'Review your security alerts'
                  : 'No new security alerts'}
              </div>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Filter Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '20px',
          overflowX: 'auto',
          paddingBottom: '8px',
          margin: '0 -20px 20px',
          padding: '0 20px 8px',
        }}
      >
        {filterOptions.map((filter) => (
          <motion.button
            key={filter}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setSelectedFilter(filter)}
            style={{
              padding: '10px 18px',
              borderRadius: '20px',
              border: 'none',
              background: selectedFilter === filter 
                ? colors.accent 
                : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
              color: selectedFilter === filter ? '#fff' : colors.text,
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {filter}
          </motion.button>
        ))}
      </motion.div>

      {/* Alerts List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <AnimatePresence>
          {filteredAlerts.map((alert, index) => (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100, height: 0 }}
              transition={{ delay: index * 0.05 }}
              layout
            >
              <GlassCard 
                padding="0" 
                borderRadius="20px"
                style={{ 
                  overflow: 'hidden',
                  borderLeft: `4px solid ${getSeverityColor(alert.severity)}`,
                }}
              >
                <motion.div
                  onClick={() => {
                    setExpandedAlert(expandedAlert === alert.id ? null : alert.id);
                    markAsRead(alert.id);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    padding: '16px',
                    cursor: 'pointer',
                    background: !alert.isRead 
                      ? isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'
                      : 'transparent',
                  }}
                >
                  {/* Icon */}
                  <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    background: `${getSeverityColor(alert.severity)}15`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: getSeverityColor(alert.severity),
                    flexShrink: 0,
                  }}>
                    {getTypeIcon(alert.type)}
                  </div>
                  
                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ 
                        fontSize: '15px', 
                        fontWeight: 600, 
                        color: colors.text,
                      }}>
                        {alert.title}
                      </span>
                      {!alert.isRead && (
                        <BsCircleFill size={8} color={colors.accent} />
                      )}
                    </div>
                    <div style={{ 
                      fontSize: '13px', 
                      color: colors.textMuted,
                      marginTop: '2px',
                    }}>
                      {alert.location} • {alert.time}
                    </div>
                  </div>
                  
                  {/* Thumbnail or Chevron */}
                  {alert.thumbnail ? (
                    <div style={{
                      width: '50px',
                      height: '50px',
                      borderRadius: '10px',
                      overflow: 'hidden',
                      flexShrink: 0,
                    }}>
                      <img 
                        src={alert.thumbnail}
                        alt=""
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>
                  ) : (
                    <motion.div
                      animate={{ rotate: expandedAlert === alert.id ? 90 : 0 }}
                    >
                      <BsChevronRight size={16} style={{ color: colors.textMuted }} />
                    </motion.div>
                  )}
                </motion.div>
                
                {/* Expanded Content */}
                <AnimatePresence>
                  {expandedAlert === alert.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      style={{ 
                        overflow: 'hidden',
                        borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}`,
                      }}
                    >
                      <div style={{ padding: '16px' }}>
                        <p style={{ 
                          fontSize: '14px', 
                          color: colors.textSecondary,
                          marginBottom: '16px',
                          lineHeight: 1.5,
                        }}>
                          {alert.description}
                        </p>
                        
                        {alert.thumbnail && (
                          <div style={{
                            width: '100%',
                            height: '150px',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            marginBottom: '16px',
                          }}>
                            <img 
                              src={alert.thumbnail}
                              alt=""
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          </div>
                        )}
                        
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            style={{
                              flex: 1,
                              padding: '12px',
                              borderRadius: '12px',
                              border: 'none',
                              background: colors.accent,
                              color: '#fff',
                              fontSize: '13px',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            View Camera
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteAlert(alert.id);
                            }}
                            style={{
                              width: '48px',
                              padding: '12px',
                              borderRadius: '12px',
                              border: 'none',
                              background: 'rgba(239, 68, 68, 0.1)',
                              color: '#ef4444',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <HiOutlineTrash size={18} />
                          </motion.button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </GlassCard>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Empty State */}
      {filteredAlerts.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            textAlign: 'center',
            padding: '60px 20px',
          }}
        >
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
          }}>
            <HiOutlineBell size={40} style={{ color: colors.textMuted }} />
          </div>
          <h3 style={{ 
            fontSize: '18px', 
            fontWeight: 600, 
            color: colors.text,
            marginBottom: '8px',
          }}>
            No Alerts
          </h3>
          <p style={{ 
            fontSize: '14px', 
            color: colors.textMuted,
          }}>
            No alerts match your current filter
          </p>
        </motion.div>
      )}
    </div>
  );
};
