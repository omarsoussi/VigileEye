import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Video, 
  Target, 
  AlertTriangle, 
  BarChart3, 
  History, 
  Settings,
  Shield,
  Menu,
  X
} from 'lucide-react';

const navItems = [
  { icon: LayoutDashboard, path: '/dashboard', label: 'Dashboard' },
  { icon: Video, path: '/monitoring', label: 'Live Monitoring' },
  { icon: Target, path: '/zones', label: 'Zones / ROIs' },
  { icon: AlertTriangle, path: '/alerts', label: 'Alerts' },
  { icon: BarChart3, path: '/analytics', label: 'Analytics' },
  { icon: History, path: '/history', label: 'History' },
  { icon: Settings, path: '/settings', label: 'Settings' },
];

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onToggle }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleNavClick = (path: string) => {
    navigate(path);
    if (isMobile) {
      onToggle();
    }
  };

  const sidebarStyle: React.CSSProperties = {
    width: isMobile ? '100%' : '260px',
    maxWidth: isMobile ? '300px' : '260px',
    minHeight: '100vh',
    height: '100%',
    background: 'linear-gradient(180deg, #0a0a14 0%, #0d0d1a 100%)',
    borderRight: '1px solid rgba(0, 212, 255, 0.1)',
    padding: '24px 16px',
    paddingTop: isMobile ? 'max(24px, env(safe-area-inset-top))' : '24px',
    display: 'flex',
    flexDirection: 'column',
    position: 'fixed',
    left: isMobile ? (isOpen ? 0 : '-100%') : 0,
    top: 0,
    zIndex: 1000,
    transition: 'left 0.3s ease',
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
  };

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.7)',
    backdropFilter: 'blur(4px)',
    zIndex: 999,
    opacity: isOpen ? 1 : 0,
    pointerEvents: isOpen ? 'auto' : 'none',
    transition: 'opacity 0.3s ease',
  };

  const logoStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '32px',
    padding: '0 12px',
  };

  const logoIconStyle: React.CSSProperties = {
    width: '44px',
    height: '44px',
    background: 'linear-gradient(135deg, #00d4ff 0%, #0099ff 100%)',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    boxShadow: '0 0 20px rgba(0, 212, 255, 0.4)',
    flexShrink: 0,
  };

  const logoTextStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
  };

  const navStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    flex: 1,
  };

  const getNavItemStyle = (isActive: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: isMobile ? '16px' : '14px 16px',
    borderRadius: '12px',
    background: isActive ? 'rgba(0, 212, 255, 0.15)' : 'transparent',
    border: isActive ? '1px solid rgba(0, 212, 255, 0.3)' : '1px solid transparent',
    color: isActive ? '#00d4ff' : 'rgba(255, 255, 255, 0.6)',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: isActive ? '0 0 20px rgba(0, 212, 255, 0.2)' : 'none',
    textAlign: 'left',
    width: '100%',
  });

  return (
    <>
      {/* Mobile Overlay */}
      {isMobile && <div style={overlayStyle} onClick={onToggle} />}

      <aside style={sidebarStyle}>
        {/* Close button for mobile */}
        {isMobile && (
          <button
            onClick={onToggle}
            style={{
              position: 'absolute',
              top: 'max(20px, env(safe-area-inset-top))',
              right: '16px',
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <X size={20} />
          </button>
        )}

        {/* Logo */}
        <div style={logoStyle}>
          <div style={logoIconStyle}>
            <Shield size={24} />
          </div>
          <div style={logoTextStyle}>
            <span style={{ color: 'white', fontSize: '18px', fontWeight: 700, letterSpacing: '-0.5px' }}>
              VIGILEYE
            </span>
            <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '11px', letterSpacing: '1px' }}>
              AI SECURITY
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav style={navStyle}>
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                style={getNavItemStyle(isActive)}
                onClick={() => handleNavClick(item.path)}
              >
                <item.icon size={20} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* System Status */}
        <div style={{
          padding: '16px',
          background: 'rgba(0, 212, 255, 0.08)',
          borderRadius: '12px',
          border: '1px solid rgba(0, 212, 255, 0.2)',
          marginTop: '16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <div style={{
              width: '8px',
              height: '8px',
              background: '#22c55e',
              borderRadius: '50%',
              boxShadow: '0 0 10px rgba(34, 197, 94, 0.6)',
            }} />
            <span style={{ color: '#22c55e', fontSize: '12px', fontWeight: 600 }}>System Active</span>
          </div>
          <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '11px' }}>
            All cameras online • AI Running
          </span>
        </div>
      </aside>
    </>
  );
};

// Mobile Header Component
export const MobileHeader: React.FC<{ onMenuClick: () => void }> = ({ onMenuClick }) => {
  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px 20px',
      paddingTop: 'max(16px, env(safe-area-inset-top))',
      background: 'linear-gradient(180deg, #0a0a14 0%, transparent 100%)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      <button
        onClick={onMenuClick}
        style={{
          width: '44px',
          height: '44px',
          borderRadius: '12px',
          background: 'rgba(255, 255, 255, 0.1)',
          border: 'none',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
        }}
      >
        <Menu size={22} />
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{
          width: '36px',
          height: '36px',
          background: 'linear-gradient(135deg, #00d4ff 0%, #0099ff 100%)',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          boxShadow: '0 0 15px rgba(0, 212, 255, 0.4)',
        }}>
          <Shield size={18} />
        </div>
        <span style={{ color: 'white', fontSize: '16px', fontWeight: 700 }}>VIGILEYE</span>
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '8px 12px',
        background: 'rgba(34, 197, 94, 0.15)',
        borderRadius: '8px',
      }}>
        <div style={{
          width: '8px',
          height: '8px',
          background: '#22c55e',
          borderRadius: '50%',
          boxShadow: '0 0 8px rgba(34, 197, 94, 0.6)',
        }} />
        <span style={{ color: '#22c55e', fontSize: '11px', fontWeight: 600 }}>LIVE</span>
      </div>
    </header>
  );
};
