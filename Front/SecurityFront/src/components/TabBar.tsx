import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { membersApi } from '../services/api';
import { 
  HiOutlineHome, 
  HiHome,
  HiOutlineVideoCamera,
  HiVideoCamera,
  HiOutlineShieldCheck,
  HiShieldCheck,
  HiOutlineBell,
  HiBell,
  HiOutlineUsers,
  HiUsers,
  HiOutlineCog,
  HiCog,
  HiOutlineAdjustments,
  HiAdjustments
} from 'react-icons/hi';
import { BsCameraVideo, BsGrid } from 'react-icons/bs';

interface TabItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  activeIcon: React.ReactNode;
  hasDropdown?: boolean;
  dropdownItems?: { path: string; label: string; icon: React.ReactNode }[];
}

export const TabBar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { colors, preferences } = useTheme();
  const isDark = preferences.mode === 'dark';

  const [membersBadgeCount, setMembersBadgeCount] = useState(0);
  const [configureDropdownOpen, setConfigureDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setConfigureDropdownOpen(false);
      }
    };

    if (configureDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [configureDropdownOpen]);

  const tabs: TabItem[] = [
    {
      path: '/dashboard',
      label: 'Home',
      icon: <HiOutlineHome size={24} />,
      activeIcon: <HiHome size={24} />,
    },
    {
      path: '/monitoring',
      label: 'Live',
      icon: <HiOutlineVideoCamera size={24} />,
      activeIcon: <HiVideoCamera size={24} />,
    },
    {
      path: '/configure',
      label: 'Configure',
      icon: <HiOutlineAdjustments size={24} />,
      activeIcon: <HiAdjustments size={24} />,
      hasDropdown: true,
      dropdownItems: [
        { path: '/zones', label: 'Zones', icon: <HiOutlineShieldCheck size={20} /> },
        { path: '/cameras', label: 'Cameras', icon: <BsCameraVideo size={20} /> },
      ],
    },
    {
      path: '/alerts',
      label: 'Alerts',
      icon: <HiOutlineBell size={24} />,
      activeIcon: <HiBell size={24} />,
    },
    {
      path: '/members',
      label: 'Members',
      icon: <HiOutlineUsers size={24} />,
      activeIcon: <HiUsers size={24} />,
    },
    {
      path: '/settings',
      label: 'Settings',
      icon: <HiOutlineCog size={24} />,
      activeIcon: <HiCog size={24} />,
    },
  ];

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/' || location.pathname === '/dashboard';
    }
    // For Configure tab, check if on zones or cameras path
    if (path === '/configure') {
      return location.pathname.startsWith('/zones') || location.pathname.startsWith('/cameras');
    }
    return location.pathname.startsWith(path);
  };

  const refreshMembersBadge = useCallback(async () => {
    try {
      const received = await membersApi.listReceivedInvitations();
      const pendingCount = received.filter((inv) => inv.status === 'pending').length;
      setMembersBadgeCount(pendingCount);
    } catch {
      setMembersBadgeCount(0);
    }
  }, []);

  useEffect(() => {
    refreshMembersBadge();
    const intervalId = window.setInterval(refreshMembersBadge, 20_000);
    const onFocus = () => refreshMembersBadge();
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', onFocus);
    };
  }, [refreshMembersBadge]);

  useEffect(() => {
    if (location.pathname.startsWith('/members')) {
      refreshMembersBadge();
    }
  }, [location.pathname, refreshMembersBadge]);

  const tabBadgeCounts = useMemo(() => {
    return {
      '/members': membersBadgeCount,
    };
  }, [membersBadgeCount]);

  return (
    <motion.nav
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '85px',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        background: isDark 
          ? 'rgba(20, 20, 30, 0.85)'
          : 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(40px)',
        WebkitBackdropFilter: 'blur(40px)',
        borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        width: '100%',
        maxWidth: '100%',
        gap: 'clamp(8px, 2vw, 24px)',
        paddingLeft: 'clamp(8px, 2vw, 16px)',
        paddingRight: 'clamp(8px, 2vw, 16px)',
      }}>
      {tabs.map((tab) => {
        const active = isActive(tab.path);
        const badgeCount = tabBadgeCounts[tab.path as keyof typeof tabBadgeCounts] || 0;
        
        // Special handling for Configure tab with dropdown
        if (tab.hasDropdown && tab.dropdownItems) {
          return (
            <div
              key={tab.path}
              ref={dropdownRef}
              style={{ position: 'relative' }}
            >
              {/* Dropdown Menu */}
              <AnimatePresence>
                {configureDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    style={{
                      position: 'absolute',
                      bottom: '70px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: isDark 
                        ? 'rgba(30, 30, 45, 0.98)'
                        : 'rgba(255, 255, 255, 0.98)',
                      backdropFilter: 'blur(20px)',
                      WebkitBackdropFilter: 'blur(20px)',
                      borderRadius: '16px',
                      padding: '8px',
                      minWidth: '140px',
                      boxShadow: isDark
                        ? '0 10px 40px rgba(0,0,0,0.5)'
                        : '0 10px 40px rgba(0,0,0,0.15)',
                      border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                      zIndex: 1001,
                    }}
                  >
                    {tab.dropdownItems.map((item, index) => (
                      <motion.button
                        key={item.path}
                        onClick={() => {
                          navigate(item.path);
                          setConfigureDropdownOpen(false);
                        }}
                        whileHover={{ scale: 1.02, x: 4 }}
                        whileTap={{ scale: 0.98 }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          width: '100%',
                          padding: '12px 16px',
                          background: location.pathname.startsWith(item.path)
                            ? `${colors.accent}20`
                            : 'transparent',
                          border: 'none',
                          borderRadius: '12px',
                          cursor: 'pointer',
                          color: location.pathname.startsWith(item.path) 
                            ? colors.accent 
                            : colors.text,
                          fontSize: '14px',
                          fontWeight: 500,
                          textAlign: 'left',
                          marginBottom: index < tab.dropdownItems!.length - 1 ? '4px' : 0,
                        }}
                      >
                        <span style={{ 
                          color: location.pathname.startsWith(item.path) 
                            ? colors.accent 
                            : colors.textMuted 
                        }}>
                          {item.icon}
                        </span>
                        {item.label}
                      </motion.button>
                    ))}
                    
                    {/* Arrow pointer */}
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '-8px',
                        left: '50%',
                        transform: 'translateX(-50%) rotate(45deg)',
                        width: '16px',
                        height: '16px',
                        background: isDark 
                          ? 'rgba(30, 30, 45, 0.98)'
                          : 'rgba(255, 255, 255, 0.98)',
                        borderRight: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                        borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                      }}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.button
                onClick={() => setConfigureDropdownOpen(!configureDropdownOpen)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.9 }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  padding: '8px 16px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: active ? colors.accent : colors.textMuted,
                  position: 'relative',
                }}
              >
                {/* Active indicator */}
                {active && (
                  <motion.div
                    layoutId="tabIndicator"
                    style={{
                      position: 'absolute',
                      top: '-1px',
                      width: '20px',
                      height: '3px',
                      borderRadius: '0 0 4px 4px',
                      background: colors.accent,
                    }}
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
                
                <motion.div
                  animate={{ 
                    scale: active ? 1.1 : 1,
                    y: active ? -2 : 0,
                    rotate: configureDropdownOpen ? 90 : 0,
                  }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  style={{ position: 'relative' }}
                >
                  {active ? tab.activeIcon : tab.icon}
                </motion.div>
                
                <motion.span
                  animate={{ 
                    opacity: active ? 1 : 0.6,
                    scale: active ? 1 : 0.95,
                  }}
                  style={{
                    fontSize: '11px',
                    fontWeight: active ? 600 : 500,
                    letterSpacing: '-0.2px',
                  }}
                >
                  {tab.label}
                </motion.span>
              </motion.button>
            </div>
          );
        }
        
        return (
          <motion.button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.9 }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              padding: '8px 16px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: active ? colors.accent : colors.textMuted,
              position: 'relative',
            }}
          >
            {/* Active indicator */}
            {active && (
              <motion.div
                layoutId="tabIndicator"
                style={{
                  position: 'absolute',
                  top: '-1px',
                  width: '20px',
                  height: '3px',
                  borderRadius: '0 0 4px 4px',
                  background: colors.accent,
                }}
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}
            
            <motion.div
              animate={{ 
                scale: active ? 1.1 : 1,
                y: active ? -2 : 0,
              }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              style={{ position: 'relative' }}
            >
              {active ? tab.activeIcon : tab.icon}

              {badgeCount > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    top: '-6px',
                    right: '-10px',
                    minWidth: '18px',
                    height: '18px',
                    padding: '0 6px',
                    borderRadius: '999px',
                    background: '#ef4444',
                    border: `2px solid ${isDark ? 'rgba(20, 20, 30, 0.85)' : 'rgba(255, 255, 255, 0.85)'}`,
                    color: '#fff',
                    fontSize: '11px',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    lineHeight: 1,
                  }}
                >
                  {badgeCount > 99 ? '99+' : badgeCount}
                </div>
              )}
            </motion.div>
            
            <motion.span
              animate={{ 
                opacity: active ? 1 : 0.6,
                scale: active ? 1 : 0.95,
              }}
              style={{
                fontSize: '11px',
                fontWeight: active ? 600 : 500,
                letterSpacing: '-0.2px',
              }}
            >
              {tab.label}
            </motion.span>
          </motion.button>
        );
      })}
      </div>
    </motion.nav>
  );
};
