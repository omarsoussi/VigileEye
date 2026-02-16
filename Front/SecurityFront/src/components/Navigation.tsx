import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Camera, Key, Settings, Grid } from 'lucide-react';
import styles from './Navigation.module.css';

export const Navigation: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Hide navigation on landing page
  if (location.pathname === '/') {
    return null;
  }

  // Dark theme pages
  const isDarkTheme = location.pathname === '/outdoor' || location.pathname === '/access';

  const navItems = [
    { icon: Home, path: '/cameras', label: 'Home' },
    { icon: Camera, path: '/outdoor', label: 'Camera' },
    { icon: Grid, path: '/live/1', label: 'Live' },
    { icon: Key, path: '/access', label: 'Access' },
    { icon: Settings, path: '/settings', label: 'Settings' }
  ];

  return (
    <nav className={`${styles.navigation} ${isDarkTheme ? styles.dark : ''}`}>
      <div className={styles.navContainer}>
        {navItems.map((item) => (
          <button
            key={item.path}
            className={`${styles.navItem} ${location.pathname === item.path ? styles.active : ''}`}
            onClick={() => navigate(item.path)}
          >
            <item.icon size={22} />
            <span className={styles.navLabel}>{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};
