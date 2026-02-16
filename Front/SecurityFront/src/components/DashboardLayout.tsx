import React, { useState, useEffect } from 'react';
import { Sidebar, MobileHeader } from './Sidebar';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: '#0a0a14',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    }}>
      <Sidebar isOpen={sidebarOpen} onToggle={toggleSidebar} />
      
      <main style={{
        flex: 1,
        marginLeft: isMobile ? 0 : '260px',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        transition: 'margin-left 0.3s ease',
      }}>
        {/* Mobile Header */}
        {isMobile && <MobileHeader onMenuClick={toggleSidebar} />}
        
        {/* Content */}
        <div style={{
          flex: 1,
          padding: isMobile ? '16px' : '24px',
          paddingBottom: isMobile ? 'max(24px, env(safe-area-inset-bottom))' : '24px',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
        }}>
          {children}
        </div>
      </main>
    </div>
  );
};
