import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';
import { GlassCard, ToggleSwitch } from '../../components/GlassCard';
import { 
  HiOutlineShieldCheck,
  HiOutlineHome,
  HiOutlineSun,
  HiOutlineMoon,
  HiOutlinePlus,
  HiOutlinePencil,
  HiOutlineLocationMarker,
  HiOutlineClock,
  HiOutlineCalendar,
} from 'react-icons/hi';
import { 
  RiShieldCheckLine, 
  RiShieldLine,
  RiDoorOpenLine,
  RiCarLine,
} from 'react-icons/ri';
import { BsChevronRight } from 'react-icons/bs';

interface Zone {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  isArmed: boolean;
  cameras: number;
  sensors: number;
  lastActivity?: string;
}

const securityModes = [
  { 
    id: 'away', 
    name: 'Away', 
    description: 'Full protection when no one is home',
    icon: <RiShieldCheckLine size={24} />,
    color: '#22c55e',
  },
  { 
    id: 'home', 
    name: 'Home', 
    description: 'Perimeter protection only',
    icon: <HiOutlineHome size={24} />,
    color: '#3b82f6',
  },
  { 
    id: 'night', 
    name: 'Night', 
    description: 'Bedtime protection settings',
    icon: <HiOutlineMoon size={24} />,
    color: '#8b5cf6',
  },
  { 
    id: 'disarm', 
    name: 'Disarmed', 
    description: 'All zones disarmed',
    icon: <RiShieldLine size={24} />,
    color: '#6b7280',
  },
];

export const ZonesPageNew: React.FC = () => {
  const { colors, preferences } = useTheme();
  const isDark = preferences.mode === 'dark';
  const [selectedMode, setSelectedMode] = useState('away');
  const [zones, setZones] = useState<Zone[]>([
    { id: '1', name: 'Front Entrance', icon: <RiDoorOpenLine size={22} />, color: '#3b82f6', isArmed: true, cameras: 2, sensors: 3, lastActivity: '5 min ago' },
    { id: '2', name: 'Backyard', icon: <HiOutlineSun size={22} />, color: '#22c55e', isArmed: true, cameras: 1, sensors: 2, lastActivity: '1 hour ago' },
    { id: '3', name: 'Garage', icon: <RiCarLine size={22} />, color: '#f59e0b', isArmed: false, cameras: 1, sensors: 1, lastActivity: '30 min ago' },
    { id: '4', name: 'Living Room', icon: <HiOutlineHome size={22} />, color: '#8b5cf6', isArmed: true, cameras: 2, sensors: 4 },
  ]);

  const toggleZone = (id: string) => {
    setZones(prev => prev.map(zone => 
      zone.id === id ? { ...zone, isArmed: !zone.isArmed } : zone
    ));
  };

  const armedZonesCount = zones.filter(z => z.isArmed).length;
  const currentMode = securityModes.find(m => m.id === selectedMode);

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
        style={{ marginBottom: '24px' }}
      >
        <h1 style={{
          fontSize: '32px',
          fontWeight: 700,
          color: colors.text,
          letterSpacing: '-0.5px',
        }}>
          Security Zones
        </h1>
        <p style={{ 
          fontSize: '14px', 
          color: colors.textMuted,
          marginTop: '4px',
        }}>
          {armedZonesCount} of {zones.length} zones armed
        </p>
      </motion.div>

      {/* Current Status Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <GlassCard 
          variant="elevated" 
          padding="20px" 
          borderRadius="24px"
          style={{ marginBottom: '24px' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <motion.div
              animate={{ 
                boxShadow: selectedMode !== 'disarm' ? [
                  `0 0 0 0 ${currentMode?.color}40`,
                  `0 0 0 15px ${currentMode?.color}00`,
                ] : undefined,
              }}
              transition={{ duration: 1.5, repeat: selectedMode !== 'disarm' ? Infinity : 0 }}
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '20px',
                background: `linear-gradient(135deg, ${currentMode?.color} 0%, ${currentMode?.color}cc 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
              }}
            >
              {currentMode?.icon}
            </motion.div>
            <div style={{ flex: 1 }}>
              <div style={{ 
                fontSize: '12px', 
                fontWeight: 600, 
                color: currentMode?.color,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '4px',
              }}>
                Current Mode
              </div>
              <div style={{ 
                fontSize: '22px', 
                fontWeight: 700, 
                color: colors.text,
                marginBottom: '2px',
              }}>
                {currentMode?.name}
              </div>
              <div style={{ 
                fontSize: '13px', 
                color: colors.textSecondary,
              }}>
                {currentMode?.description}
              </div>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Security Modes */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        style={{ marginBottom: '24px' }}
      >
        <h2 style={{ 
          fontSize: '18px', 
          fontWeight: 600, 
          color: colors.text,
          marginBottom: '12px',
        }}>
          Security Modes
        </h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
          {securityModes.map((mode) => (
            <motion.button
              key={mode.id}
              whileHover={{ scale: 1.05, y: -4 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedMode(mode.id)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                padding: '16px 8px',
                borderRadius: '16px',
                border: selectedMode === mode.id 
                  ? `2px solid ${mode.color}` 
                  : `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}`,
                background: selectedMode === mode.id 
                  ? `${mode.color}15` 
                  : isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                cursor: 'pointer',
                color: selectedMode === mode.id ? mode.color : colors.textMuted,
              }}
            >
              {mode.icon}
              <span style={{ 
                fontSize: '11px', 
                fontWeight: 600,
                color: selectedMode === mode.id ? mode.color : colors.text,
              }}>
                {mode.name}
              </span>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Zones List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px',
        }}>
          <h2 style={{ 
            fontSize: '18px', 
            fontWeight: 600, 
            color: colors.text,
          }}>
            Zones
          </h2>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '12px',
              border: 'none',
              background: colors.accent,
              color: '#fff',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <HiOutlinePlus size={16} />
            Add Zone
          </motion.button>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {zones.map((zone, index) => (
            <motion.div
              key={zone.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25 + index * 0.05 }}
            >
              <GlassCard padding="16px" borderRadius="20px">
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  {/* Icon */}
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '14px',
                    background: `${zone.color}15`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: zone.color,
                  }}>
                    {zone.icon}
                  </div>
                  
                  {/* Content */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ 
                        fontSize: '16px', 
                        fontWeight: 600, 
                        color: colors.text,
                      }}>
                        {zone.name}
                      </span>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '8px',
                        background: zone.isArmed 
                          ? 'rgba(34, 197, 94, 0.15)'
                          : 'rgba(107, 114, 128, 0.15)',
                        fontSize: '10px',
                        fontWeight: 700,
                        color: zone.isArmed ? '#22c55e' : '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}>
                        {zone.isArmed ? 'Armed' : 'Disarmed'}
                      </span>
                    </div>
                    <div style={{ 
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      marginTop: '4px',
                      fontSize: '12px', 
                      color: colors.textMuted,
                    }}>
                      <span>{zone.cameras} cameras</span>
                      <span>•</span>
                      <span>{zone.sensors} sensors</span>
                      {zone.lastActivity && (
                        <>
                          <span>•</span>
                          <span>{zone.lastActivity}</span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {/* Toggle */}
                  <ToggleSwitch 
                    checked={zone.isArmed} 
                    onChange={() => toggleZone(zone.id)} 
                  />
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Schedule Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        style={{ marginTop: '24px' }}
      >
        <h2 style={{ 
          fontSize: '18px', 
          fontWeight: 600, 
          color: colors.text,
          marginBottom: '12px',
        }}>
          Automation
        </h2>
        
        <GlassCard padding="0" borderRadius="20px">
          <motion.div
            whileHover={{ backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              padding: '16px',
              cursor: 'pointer',
              borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}`,
            }}
          >
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'rgba(59, 130, 246, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#3b82f6',
            }}>
              <HiOutlineClock size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <span style={{ 
                fontSize: '15px', 
                fontWeight: 500, 
                color: colors.text,
              }}>
                Schedule
              </span>
              <div style={{ fontSize: '12px', color: colors.textMuted }}>
                Auto arm at 10:00 PM
              </div>
            </div>
            <BsChevronRight size={16} style={{ color: colors.textMuted }} />
          </motion.div>
          
          <motion.div
            whileHover={{ backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              padding: '16px',
              cursor: 'pointer',
            }}
          >
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'rgba(139, 92, 246, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#8b5cf6',
            }}>
              <HiOutlineLocationMarker size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <span style={{ 
                fontSize: '15px', 
                fontWeight: 500, 
                color: colors.text,
              }}>
                Geofencing
              </span>
              <div style={{ fontSize: '12px', color: colors.textMuted }}>
                Auto arm when leaving home
              </div>
            </div>
            <BsChevronRight size={16} style={{ color: colors.textMuted }} />
          </motion.div>
        </GlassCard>
      </motion.div>
    </div>
  );
};
