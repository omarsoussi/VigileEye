import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { GlassCard, ToggleSwitch, AnimatedButton } from '../../components/GlassCard';
import { loginHistoryApi, LoginHistoryEntry as ApiLoginHistoryEntry } from '../../services/api';
import { 
  HiOutlineMoon, 
  HiOutlineSun,
  HiOutlineColorSwatch,
  HiOutlinePhotograph,
  HiOutlineBell,
  HiOutlineShieldCheck,
  HiOutlineCamera,
  HiOutlineWifi,
  HiOutlineDatabase,
  HiOutlineUser,
  HiOutlineLogout,
  HiOutlineQuestionMarkCircle,
  HiOutlineDocumentText,
  HiCheck,
  HiOutlineVideoCamera,
  HiOutlineLockClosed,
  HiOutlineKey,
  HiOutlineMail,
  HiOutlineEye,
  HiOutlineEyeOff,
  HiOutlineX,
  HiOutlineClock,
  HiOutlineDesktopComputer,
  HiOutlineDeviceMobile,
  HiOutlineExclamation,
  HiOutlineSearch,
  HiOutlineCalendar,
  HiOutlineFilter,
  HiOutlineGlobeAlt,
  HiOutlineRefresh,
} from 'react-icons/hi';
import { BsChevronRight, BsLaptop, BsPhone, BsTablet, BsDisplay } from 'react-icons/bs';

interface SettingsSectionProps {
  title: string;
  children: React.ReactNode;
}

// Color Picker Component
const ColorPicker: React.FC<{ 
  color: string;
  onChange: (color: string) => void;
  label?: string;
}> = ({ color, onChange, label }) => {
  const gradientRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);
  const [hue, setHue] = useState(0);

  const hexToHsv = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
    
    let h = 0;
    if (delta !== 0) {
      if (max === r) h = ((g - b) / delta + (g < b ? 6 : 0)) / 6;
      else if (max === g) h = ((b - r) / delta + 2) / 6;
      else h = ((r - g) / delta + 4) / 6;
    }
    
    const s = max === 0 ? 0 : delta / max;
    const v = max;
    
    return { h: h * 360, s, v };
  };

  const hsvToHex = (h: number, s: number, v: number) => {
    const c = v * s;
    const hp = h / 60;
    const x = c * (1 - Math.abs(hp % 2 - 1));
    let r = 0, g = 0, b = 0;
    
    if (hp >= 0 && hp < 1) { r = c; g = x; }
    else if (hp >= 1 && hp < 2) { r = x; g = c; }
    else if (hp >= 2 && hp < 3) { g = c; b = x; }
    else if (hp >= 3 && hp < 4) { g = x; b = c; }
    else if (hp >= 4 && hp < 5) { r = x; b = c; }
    else { r = c; b = x; }
    
    const toHex = (n: number) => {
      const hex = Math.round((n + 0) * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
  };

  const handleGradientClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!gradientRef.current) return;
    const rect = gradientRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    
    const s = x;
    const v = 1 - y;
    
    const newColor = hsvToHex(hue, s, v);
    onChange(newColor);
  };

  const handleHueClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!hueRef.current) return;
    const rect = hueRef.current.getBoundingClientRect();
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    setHue(360 - y * 360);
  };

  const { s, v } = hexToHsv(color);

  return (
    <div style={{ marginBottom: '16px' }}>
      {label && (
        <p style={{ 
          fontSize: '11px', 
          color: '#999',
          marginBottom: '8px',
        }}>
          {label}
        </p>
      )}
      <div style={{ display: 'flex', gap: '12px' }}>
        {/* Gradient Area */}
        <div
          ref={gradientRef}
          onClick={handleGradientClick}
          style={{
            flex: 1,
            height: '180px',
            borderRadius: '8px',
            cursor: 'crosshair',
            background: `linear-gradient(90deg, white, hsl(${hue}, 100%, 50%)),
                         linear-gradient(180deg, rgba(0,0,0,0), black)`,
            border: '1px solid rgba(255,255,255,0.1)',
            position: 'relative',
          }}
        >
          {/* Cursor */}
          <div
            style={{
              position: 'absolute',
              left: `${s * 100}%`,
              top: `${(1 - v) * 100}%`,
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              border: '2px solid white',
              boxShadow: '0 0 0 1px black, 0 0 4px rgba(255,255,255,0.5)',
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none',
            }}
          />
        </div>

        {/* Hue Slider */}
        <div
          ref={hueRef}
          onClick={handleHueClick}
          style={{
            width: '30px',
            height: '180px',
            borderRadius: '8px',
            cursor: 'pointer',
            background: `linear-gradient(180deg, 
              #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)`,
            border: '1px solid rgba(255,255,255,0.1)',
            position: 'relative',
          }}
        >
          {/* Hue Cursor */}
          <div
            style={{
              position: 'absolute',
              left: '-3px',
              top: `${(1 - hue / 360) * 100}%`,
              width: '36px',
              height: '3px',
              background: 'white',
              borderRadius: '2px',
              boxShadow: '0 0 0 1px black',
              transform: 'translateY(-50%)',
              pointerEvents: 'none',
            }}
          />
        </div>
      </div>

      {/* Color Display and Hex Input */}
      <div style={{ display: 'flex', gap: '10px', marginTop: '10px', alignItems: 'center' }}>
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '8px',
            background: color,
            border: '1px solid rgba(255,255,255,0.2)',
            boxShadow: `0 0 8px ${color}60`,
          }}
        />
        <div style={{ flex: 1 }}>
          <input
            type="text"
            value={color}
            onChange={(e) => onChange(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 10px',
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '6px',
              color: '#fff',
              fontSize: '13px',
              fontFamily: 'monospace',
            }}
          />
        </div>
      </div>
    </div>
  );
};

const SettingsSection: React.FC<SettingsSectionProps> = ({ title, children }) => {
  const { colors } = useTheme();
  
  return (
    <div style={{ marginBottom: '24px' }}>
      <h3 style={{ 
        fontSize: '13px', 
        fontWeight: 600, 
        color: colors.textMuted,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        marginBottom: '12px',
        paddingLeft: '4px',
      }}>
        {title}
      </h3>
      <GlassCard padding="0" borderRadius="20px">
        {children}
      </GlassCard>
    </div>
  );
};

// Login History Types
interface LoginHistoryEntry {
  id: string;
  timestamp: Date;
  ipAddress: string;
  location: string;
  device: string;
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  browser: string;
  os: string;
  success: boolean;
  isSuspicious: boolean;
}

// Convert API response to local format
const mapApiToLocalEntry = (entry: ApiLoginHistoryEntry): LoginHistoryEntry => ({
  id: entry.id,
  timestamp: new Date(entry.timestamp),
  ipAddress: entry.ip_address,
  location: entry.location || 'Unknown Location',
  device: entry.browser || 'Unknown Device',
  deviceType: entry.device_type === 'desktop' || entry.device_type === 'mobile' || entry.device_type === 'tablet' ? entry.device_type : 'unknown',
  browser: entry.browser || 'Unknown Browser',
  os: entry.os || 'Unknown OS',
  success: entry.success,
  isSuspicious: entry.is_suspicious,
});

interface SettingsRowProps {
  icon: React.ReactNode;
  iconColor?: string;
  label: string;
  value?: string;
  toggle?: boolean;
  toggleValue?: boolean;
  onToggle?: (value: boolean) => void;
  onClick?: () => void;
  isLast?: boolean;
}

const SettingsRow: React.FC<SettingsRowProps> = ({ 
  icon, 
  iconColor, 
  label, 
  value, 
  toggle, 
  toggleValue, 
  onToggle, 
  onClick,
  isLast 
}) => {
  const { colors, preferences } = useTheme();
  const isDark = preferences.mode === 'dark';
  
  return (
    <motion.div
      whileHover={{ backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        padding: '14px 16px',
        cursor: onClick ? 'pointer' : 'default',
        borderBottom: isLast ? 'none' : `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}`,
      }}
    >
      <div style={{
        width: '32px',
        height: '32px',
        borderRadius: '8px',
        background: iconColor ? `${iconColor}15` : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: iconColor || colors.accent,
      }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <span style={{ 
          fontSize: '15px', 
          fontWeight: 500, 
          color: colors.text,
        }}>
          {label}
        </span>
      </div>
      {toggle && onToggle ? (
        <ToggleSwitch checked={toggleValue || false} onChange={onToggle} />
      ) : value ? (
        <span style={{ 
          fontSize: '14px', 
          color: colors.textMuted,
          marginRight: '4px',
        }}>
          {value}
        </span>
      ) : null}
      {onClick && !toggle && (
        <BsChevronRight size={16} style={{ color: colors.textMuted }} />
      )}
    </motion.div>
  );
};

const accentColors = [
  { name: 'Cyan', value: '#00d4ff' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Yellow', value: '#eab308' },
  { name: 'Green', value: '#22c55e' },
];

// Comprehensive color palette for color wheel
const colorPalette = [
  // Reds
  '#ff0000', '#ff2d2d', '#ff5a5a', '#ff8787', '#ffb4b4',
  // Oranges
  '#ff6b00', '#ff8c2d', '#ffad5a', '#ffce87', '#ffefb4',
  // Yellows
  '#ffb700', '#ffcc00', '#ffe100', '#fff600', '#ffff99',
  // Greens
  '#00cc00', '#2dff2d', '#5aff5a', '#87ff87', '#b4ffb4',
  // Teals
  '#00cccc', '#2dffff', '#5affff', '#87ffff', '#b4ffff',
  // Blues
  '#0099ff', '#2dbaff', '#5acbff', '#87dcff', '#b4edff',
  // Purples
  '#7700ff', '#9933ff', '#bb66ff', '#dd99ff', '#ffb4ff',
  // Pinks
  '#ff0099', '#ff2db8', '#ff5ad7', '#ff87f6', '#ffb4ff',
  // Grays
  '#333333', '#666666', '#999999', '#cccccc', '#ffffff',
];

const gradientPresets = [
  { name: 'Ocean', value: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' },
  { name: 'Sunset', value: 'linear-gradient(135deg, #2d1b3d 0%, #4a2c4a 50%, #6b3a5e 100%)' },
  { name: 'Forest', value: 'linear-gradient(135deg, #1a2e1a 0%, #2e4a2e 50%, #3d6a3d 100%)' },
  { name: 'Midnight', value: 'linear-gradient(135deg, #0a0a1a 0%, #1a1a3a 50%, #2a2a5a 100%)' },
  { name: 'Aurora', value: 'linear-gradient(135deg, #1e3a5f 0%, #2d4a6f 50%, #3d5a7f 100%)' },
  { name: 'Lavender', value: 'linear-gradient(135deg, #2e2e4a 0%, #3e3e5a 50%, #4e4e6a 100%)' },
];

export const SettingsPageNew: React.FC = () => {
  const navigate = useNavigate();
  const { colors, preferences, updatePreferences, toggleMode } = useTheme();
  const { logout, user, forgotPassword, resetPassword } = useAuth();
  const isDark = preferences.mode === 'dark';
  const [showAccentPicker, setShowAccentPicker] = useState(false);
  const [showBackgroundPicker, setShowBackgroundPicker] = useState(false);
  const [solidBackgroundColor, setSolidBackgroundColor] = useState(preferences.solidBackgroundColor || '#0a0a1a');
  const [gradientColor1, setGradientColor1] = useState(preferences.gradientColor1 || '#1a1a2e');
  const [gradientColor2, setGradientColor2] = useState(preferences.gradientColor2 || '#0f3460');
  const [notifications, setNotifications] = useState(true);
  const [motionAlerts, setMotionAlerts] = useState(true);
  const [soundAlerts, setSoundAlerts] = useState(false);
  
  // Password change states
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);
  const [forgotPasswordStep, setForgotPasswordStep] = useState<'email' | 'otp'>('email');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Login History states
  const [showLoginHistory, setShowLoginHistory] = useState(false);
  const [loginHistorySearch, setLoginHistorySearch] = useState('');
  const [loginHistoryDateFilter, setLoginHistoryDateFilter] = useState<'all' | '7days' | '30days' | '90days'>('all');
  const [loginHistoryDeviceFilter, setLoginHistoryDeviceFilter] = useState<'all' | 'desktop' | 'mobile' | 'tablet'>('all');
  const [loginHistory, setLoginHistory] = useState<LoginHistoryEntry[]>([]);
  const [loginHistoryLoading, setLoginHistoryLoading] = useState(false);
  const [loginHistoryError, setLoginHistoryError] = useState<string | null>(null);
  const [hasSuspiciousLogins, setHasSuspiciousLogins] = useState(false);

  // Fetch login history from API
  const fetchLoginHistory = useCallback(async () => {
    setLoginHistoryLoading(true);
    setLoginHistoryError(null);
    try {
      // Map date filter to API period
      let period: 'today' | 'week' | 'month' | 'all' | undefined;
      if (loginHistoryDateFilter === '7days') period = 'week';
      else if (loginHistoryDateFilter === '30days') period = 'month';
      else if (loginHistoryDateFilter === '90days') period = undefined; // No 90 days option in API
      else period = 'all';

      const response = await loginHistoryApi.getLoginHistory({
        limit: 100,
        period,
        device_type: loginHistoryDeviceFilter !== 'all' ? loginHistoryDeviceFilter : undefined,
      });
      
      setLoginHistory(response.items.map(mapApiToLocalEntry));
      setHasSuspiciousLogins(response.has_suspicious);
    } catch (error) {
      console.error('Failed to fetch login history:', error);
      setLoginHistoryError('Failed to load login history. Please try again.');
    } finally {
      setLoginHistoryLoading(false);
    }
  }, [loginHistoryDateFilter, loginHistoryDeviceFilter]);

  // Fetch login history when modal opens or filters change
  useEffect(() => {
    if (showLoginHistory) {
      fetchLoginHistory();
    }
  }, [showLoginHistory, fetchLoginHistory]);

  // Filter login history (client-side search only)
  const filteredLoginHistory = useMemo(() => {
    let filtered = [...loginHistory];
    
    // Search filter (client-side)
    if (loginHistorySearch) {
      const search = loginHistorySearch.toLowerCase();
      filtered = filtered.filter(entry => 
        entry.location.toLowerCase().includes(search) ||
        entry.device.toLowerCase().includes(search) ||
        entry.browser.toLowerCase().includes(search) ||
        entry.os.toLowerCase().includes(search) ||
        entry.ipAddress.includes(search)
      );
    }
    
    return filtered;
  }, [loginHistory, loginHistorySearch]);

  // Get device icon
  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'desktop': return <BsLaptop size={16} />;
      case 'mobile': return <BsPhone size={16} />;
      case 'tablet': return <BsTablet size={16} />;
      default: return <BsDisplay size={16} />;
    }
  };

  // Format date
  const formatLoginDate = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined 
    });
  };

  const passwordRequirements = [
    { label: 'At least 12 characters', met: newPassword.length >= 12 },
    { label: 'Contains uppercase', met: /[A-Z]/.test(newPassword) },
    { label: 'Contains lowercase', met: /[a-z]/.test(newPassword) },
    { label: 'Contains number', met: /\d/.test(newPassword) },
    { label: 'Contains special char', met: /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/~`]/.test(newPassword) },
    { label: 'Passwords match', met: newPassword === confirmPassword && newPassword.length > 0 },
  ];

  const allRequirementsMet = passwordRequirements.every(req => req.met);

  const handleForgotPasswordRequest = async () => {
    if (!user?.email) return;
    setPasswordError('');
    setIsPasswordLoading(true);
    try {
      const result = await forgotPassword(user.email);
      if (result.success) {
        setPasswordSuccess('Reset code sent to your email');
        setForgotPasswordStep('otp');
      } else {
        setPasswordError(result.message);
      }
    } catch (err) {
      setPasswordError('Failed to send reset code');
    } finally {
      setIsPasswordLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!user?.email || !allRequirementsMet) return;
    setPasswordError('');
    setIsPasswordLoading(true);
    try {
      const result = await resetPassword(user.email, otpCode, newPassword);
      if (result.success) {
        setPasswordSuccess('Password changed successfully!');
        setShowForgotPassword(false);
        setShowChangePassword(false);
        setNewPassword('');
        setConfirmPassword('');
        setOtpCode('');
        setForgotPasswordStep('email');
      } else {
        setPasswordError(result.message);
      }
    } catch (err) {
      setPasswordError('Failed to reset password');
    } finally {
      setIsPasswordLoading(false);
    }
  };

  const handleSignOut = () => {
    logout();
    navigate('/login');
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '14px 44px 14px 16px',
    borderRadius: '12px',
    border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
    background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
    color: colors.text,
    fontSize: '15px',
    outline: 'none',
  };

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
          Settings
        </h1>
      </motion.div>

      {/* Account Section - MOVED TO TOP */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <SettingsSection title="Account">
          {/* User Profile Card */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            padding: '20px 16px',
            borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}`,
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${colors.accent}40 0%, ${colors.accent}20 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `2px solid ${colors.accent}40`,
            }}>
              <HiOutlineUser size={28} color={colors.accent} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{
                fontSize: '18px',
                fontWeight: 600,
                color: colors.text,
                marginBottom: '4px',
              }}>
                {user?.username || 'User'}
              </p>
              <p style={{
                fontSize: '14px',
                color: colors.textSecondary,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}>
                <HiOutlineMail size={14} />
                {user?.email || 'user@example.com'}
              </p>
            </div>
          </div>

          {/* Change Password Row */}
          <SettingsRow
            icon={<HiOutlineLockClosed size={18} />}
            iconColor="#22c55e"
            label="Change Password"
            onClick={() => {
              setShowChangePassword(!showChangePassword);
              setShowForgotPassword(false);
              setPasswordError('');
              setPasswordSuccess('');
            }}
          />
          
          {/* Change Password Expandable Form */}
          <AnimatePresence>
            {showChangePassword && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                style={{ 
                  overflow: 'hidden',
                  borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}`,
                }}
              >
                <div style={{ padding: '16px' }}>
                  {passwordError && (
                    <div style={{
                      padding: '10px 14px',
                      borderRadius: '10px',
                      background: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      color: '#ef4444',
                      fontSize: '13px',
                      marginBottom: '12px',
                    }}>
                      {passwordError}
                    </div>
                  )}
                  {passwordSuccess && (
                    <div style={{
                      padding: '10px 14px',
                      borderRadius: '10px',
                      background: 'rgba(34, 197, 94, 0.15)',
                      border: '1px solid rgba(34, 197, 94, 0.3)',
                      color: '#22c55e',
                      fontSize: '13px',
                      marginBottom: '12px',
                    }}>
                      {passwordSuccess}
                    </div>
                  )}

                  <p style={{ fontSize: '13px', color: colors.textSecondary, marginBottom: '16px' }}>
                    To change your password, we'll send a verification code to your email.
                  </p>

                  {forgotPasswordStep === 'email' ? (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleForgotPasswordRequest}
                      disabled={isPasswordLoading}
                      style={{
                        width: '100%',
                        padding: '14px',
                        borderRadius: '12px',
                        border: 'none',
                        background: `linear-gradient(135deg, ${colors.accent} 0%, ${colors.accent}cc 100%)`,
                        color: '#fff',
                        fontSize: '15px',
                        fontWeight: 600,
                        cursor: isPasswordLoading ? 'not-allowed' : 'pointer',
                        opacity: isPasswordLoading ? 0.7 : 1,
                      }}
                    >
                      {isPasswordLoading ? 'Sending...' : 'Send Verification Code'}
                    </motion.button>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {/* OTP Input */}
                      <div>
                        <label style={{ fontSize: '13px', color: colors.textSecondary, marginBottom: '6px', display: 'block' }}>
                          Verification Code
                        </label>
                        <input
                          type="text"
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          placeholder="Enter 6-digit code"
                          style={inputStyle}
                        />
                      </div>

                      {/* New Password */}
                      <div style={{ position: 'relative' }}>
                        <label style={{ fontSize: '13px', color: colors.textSecondary, marginBottom: '6px', display: 'block' }}>
                          New Password
                        </label>
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Enter new password"
                          style={inputStyle}
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          style={{
                            position: 'absolute',
                            right: '14px',
                            top: '36px',
                            background: 'none',
                            border: 'none',
                            color: colors.textMuted,
                            cursor: 'pointer',
                          }}
                        >
                          {showNewPassword ? <HiOutlineEyeOff size={18} /> : <HiOutlineEye size={18} />}
                        </button>
                      </div>

                      {/* Confirm Password */}
                      <div style={{ position: 'relative' }}>
                        <label style={{ fontSize: '13px', color: colors.textSecondary, marginBottom: '6px', display: 'block' }}>
                          Confirm Password
                        </label>
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Confirm new password"
                          style={inputStyle}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          style={{
                            position: 'absolute',
                            right: '14px',
                            top: '36px',
                            background: 'none',
                            border: 'none',
                            color: colors.textMuted,
                            cursor: 'pointer',
                          }}
                        >
                          {showConfirmPassword ? <HiOutlineEyeOff size={18} /> : <HiOutlineEye size={18} />}
                        </button>
                      </div>

                      {/* Password Requirements */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
                        {passwordRequirements.map((req, index) => (
                          <div key={index} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '11px',
                            color: req.met ? '#22c55e' : colors.textMuted,
                          }}>
                            {req.met ? <HiCheck size={12} /> : <HiOutlineX size={12} />}
                            {req.label}
                          </div>
                        ))}
                      </div>

                      {/* Submit Button */}
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleResetPassword}
                        disabled={isPasswordLoading || !allRequirementsMet || otpCode.length !== 6}
                        style={{
                          width: '100%',
                          padding: '14px',
                          borderRadius: '12px',
                          border: 'none',
                          background: `linear-gradient(135deg, ${colors.accent} 0%, ${colors.accent}cc 100%)`,
                          color: '#fff',
                          fontSize: '15px',
                          fontWeight: 600,
                          cursor: (isPasswordLoading || !allRequirementsMet || otpCode.length !== 6) ? 'not-allowed' : 'pointer',
                          opacity: (isPasswordLoading || !allRequirementsMet || otpCode.length !== 6) ? 0.7 : 1,
                          marginTop: '8px',
                        }}
                      >
                        {isPasswordLoading ? 'Updating...' : 'Update Password'}
                      </motion.button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Forgot Password Row */}
          <SettingsRow
            icon={<HiOutlineKey size={18} />}
            iconColor="#f59e0b"
            label="Forgot Password"
            onClick={() => {
              setShowForgotPassword(!showForgotPassword);
              setShowChangePassword(false);
              setPasswordError('');
              setPasswordSuccess('');
              setForgotPasswordStep('email');
            }}
          />

          {/* Forgot Password Expandable Form */}
          <AnimatePresence>
            {showForgotPassword && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                style={{ 
                  overflow: 'hidden',
                  borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}`,
                }}
              >
                <div style={{ padding: '16px' }}>
                  {passwordError && (
                    <div style={{
                      padding: '10px 14px',
                      borderRadius: '10px',
                      background: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      color: '#ef4444',
                      fontSize: '13px',
                      marginBottom: '12px',
                    }}>
                      {passwordError}
                    </div>
                  )}
                  {passwordSuccess && (
                    <div style={{
                      padding: '10px 14px',
                      borderRadius: '10px',
                      background: 'rgba(34, 197, 94, 0.15)',
                      border: '1px solid rgba(34, 197, 94, 0.3)',
                      color: '#22c55e',
                      fontSize: '13px',
                      marginBottom: '12px',
                    }}>
                      {passwordSuccess}
                    </div>
                  )}

                  <p style={{ fontSize: '13px', color: colors.textSecondary, marginBottom: '16px' }}>
                    We'll send a password reset code to: <strong>{user?.email}</strong>
                  </p>

                  {forgotPasswordStep === 'email' ? (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleForgotPasswordRequest}
                      disabled={isPasswordLoading}
                      style={{
                        width: '100%',
                        padding: '14px',
                        borderRadius: '12px',
                        border: 'none',
                        background: `linear-gradient(135deg, ${colors.accent} 0%, ${colors.accent}cc 100%)`,
                        color: '#fff',
                        fontSize: '15px',
                        fontWeight: 600,
                        cursor: isPasswordLoading ? 'not-allowed' : 'pointer',
                        opacity: isPasswordLoading ? 0.7 : 1,
                      }}
                    >
                      {isPasswordLoading ? 'Sending...' : 'Send Reset Code'}
                    </motion.button>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {/* OTP Input */}
                      <div>
                        <label style={{ fontSize: '13px', color: colors.textSecondary, marginBottom: '6px', display: 'block' }}>
                          Reset Code
                        </label>
                        <input
                          type="text"
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          placeholder="Enter 6-digit code"
                          style={inputStyle}
                        />
                      </div>

                      {/* New Password */}
                      <div style={{ position: 'relative' }}>
                        <label style={{ fontSize: '13px', color: colors.textSecondary, marginBottom: '6px', display: 'block' }}>
                          New Password
                        </label>
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Enter new password"
                          style={inputStyle}
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          style={{
                            position: 'absolute',
                            right: '14px',
                            top: '36px',
                            background: 'none',
                            border: 'none',
                            color: colors.textMuted,
                            cursor: 'pointer',
                          }}
                        >
                          {showNewPassword ? <HiOutlineEyeOff size={18} /> : <HiOutlineEye size={18} />}
                        </button>
                      </div>

                      {/* Confirm Password */}
                      <div style={{ position: 'relative' }}>
                        <label style={{ fontSize: '13px', color: colors.textSecondary, marginBottom: '6px', display: 'block' }}>
                          Confirm Password
                        </label>
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Confirm new password"
                          style={inputStyle}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          style={{
                            position: 'absolute',
                            right: '14px',
                            top: '36px',
                            background: 'none',
                            border: 'none',
                            color: colors.textMuted,
                            cursor: 'pointer',
                          }}
                        >
                          {showConfirmPassword ? <HiOutlineEyeOff size={18} /> : <HiOutlineEye size={18} />}
                        </button>
                      </div>

                      {/* Password Requirements */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
                        {passwordRequirements.map((req, index) => (
                          <div key={index} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '11px',
                            color: req.met ? '#22c55e' : colors.textMuted,
                          }}>
                            {req.met ? <HiCheck size={12} /> : <HiOutlineX size={12} />}
                            {req.label}
                          </div>
                        ))}
                      </div>

                      {/* Submit Button */}
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleResetPassword}
                        disabled={isPasswordLoading || !allRequirementsMet || otpCode.length !== 6}
                        style={{
                          width: '100%',
                          padding: '14px',
                          borderRadius: '12px',
                          border: 'none',
                          background: `linear-gradient(135deg, ${colors.accent} 0%, ${colors.accent}cc 100%)`,
                          color: '#fff',
                          fontSize: '15px',
                          fontWeight: 600,
                          cursor: (isPasswordLoading || !allRequirementsMet || otpCode.length !== 6) ? 'not-allowed' : 'pointer',
                          opacity: (isPasswordLoading || !allRequirementsMet || otpCode.length !== 6) ? 0.7 : 1,
                          marginTop: '8px',
                        }}
                      >
                        {isPasswordLoading ? 'Resetting...' : 'Reset Password'}
                      </motion.button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Login History Row */}
          <SettingsRow
            icon={<HiOutlineClock size={18} />}
            iconColor="#06b6d4"
            label="Login History"
            value={hasSuspiciousLogins ? '⚠️ Review' : undefined}
            onClick={() => setShowLoginHistory(true)}
          />

          <SettingsRow
            icon={<HiOutlineQuestionMarkCircle size={18} />}
            iconColor="#3b82f6"
            label="Help & Support"
            onClick={() => {}}
          />
          <SettingsRow
            icon={<HiOutlineDocumentText size={18} />}
            iconColor="#8b5cf6"
            label="Privacy Policy"
            onClick={() => {}}
          />
          <SettingsRow
            icon={<HiOutlineLogout size={18} />}
            iconColor="#ef4444"
            label="Sign Out"
            onClick={handleSignOut}
            isLast
          />
        </SettingsSection>
      </motion.div>

      {/* Appearance Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <SettingsSection title="Appearance">
          <SettingsRow
            icon={isDark ? <HiOutlineMoon size={18} /> : <HiOutlineSun size={18} />}
            iconColor={isDark ? '#8b5cf6' : '#f59e0b'}
            label="Dark Mode"
            toggle
            toggleValue={isDark}
            onToggle={() => toggleMode()}
          />
          <SettingsRow
            icon={<HiOutlineColorSwatch size={18} />}
            iconColor={preferences.accentColor}
            label="Accent Color"
            value={accentColors.find(c => c.value === preferences.accentColor)?.name || 'Custom'}
            onClick={() => setShowAccentPicker(!showAccentPicker)}
          />
          
          {/* Accent Color Picker */}
          <AnimatePresence>
            {showAccentPicker && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                style={{ 
                  overflow: 'hidden',
                  borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}`,
                }}
              >
                <div style={{ 
                  display: 'flex', 
                  flexWrap: 'wrap',
                  gap: '10px', 
                  padding: '16px',
                }}>
                  {accentColors.map((color) => (
                    <motion.button
                      key={color.value}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => {
                        updatePreferences({ accentColor: color.value });
                        setShowAccentPicker(false);
                      }}
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: color.value,
                        border: preferences.accentColor === color.value 
                          ? '3px solid #fff' 
                          : 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: preferences.accentColor === color.value 
                          ? `0 0 0 2px ${color.value}` 
                          : 'none',
                      }}
                    >
                      {preferences.accentColor === color.value && (
                        <HiCheck size={20} color="#fff" />
                      )}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          <SettingsRow
            icon={<HiOutlinePhotograph size={18} />}
            iconColor="#22c55e"
            label="Background Style"
            value={preferences.backgroundType === 'animated' ? 'Animated' : 
                   preferences.backgroundType === 'gradient' ? 'Gradient' : 'Solid'}
            onClick={() => setShowBackgroundPicker(!showBackgroundPicker)}
          />
          
          {/* Background Style Picker */}
          <AnimatePresence>
            {showBackgroundPicker && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                style={{ 
                  overflow: 'hidden',
                  borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}`,
                }}
              >
                <div style={{ padding: '16px' }}>
                  <div style={{ 
                    display: 'flex', 
                    gap: '8px', 
                    marginBottom: '16px',
                  }}>
                    {(['solid', 'gradient', 'animated'] as const).map((type) => (
                      <motion.button
                        key={type}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => updatePreferences({ backgroundType: type })}
                        style={{
                          flex: 1,
                          padding: '10px',
                          borderRadius: '12px',
                          border: preferences.backgroundType === type 
                            ? `2px solid ${colors.accent}` 
                            : `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                          background: preferences.backgroundType === type 
                            ? `${colors.accent}15` 
                            : 'transparent',
                          color: colors.text,
                          fontSize: '13px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          textTransform: 'capitalize',
                        }}
                      >
                        {type}
                      </motion.button>
                    ))}
                  </div>
                  
                  {preferences.backgroundType === 'solid' && (
                    <div>
                      <ColorPicker
                        color={solidBackgroundColor}
                        onChange={(color) => {
                          setSolidBackgroundColor(color);
                          updatePreferences({ solidBackgroundColor: color });
                        }}
                        label="Choose Background Color:"
                      />
                    </div>
                  )}
                  
                  {preferences.backgroundType === 'gradient' && (
                    <div>
                      <ColorPicker
                        color={gradientColor1}
                        onChange={(color) => {
                          setGradientColor1(color);
                          updatePreferences({ 
                            gradientColor1: color,
                            backgroundGradient: `linear-gradient(135deg, ${color} 0%, ${gradientColor2} 100%)`
                          });
                        }}
                        label="Start Color:"
                      />
                      
                      <ColorPicker
                        color={gradientColor2}
                        onChange={(color) => {
                          setGradientColor2(color);
                          updatePreferences({ 
                            gradientColor2: color,
                            backgroundGradient: `linear-gradient(135deg, ${gradientColor1} 0%, ${color} 100%)`
                          });
                        }}
                        label="End Color:"
                      />

                      {/* Gradient Preview */}
                      <div style={{
                        marginTop: '16px',
                        height: '60px',
                        borderRadius: '12px',
                        background: `linear-gradient(135deg, ${gradientColor1} 0%, ${gradientColor2} 100%)`,
                        border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                      }} />
                    </div>
                  )}
                  
                  {preferences.backgroundType === 'animated' && (
                    <div>
                      <p style={{ 
                        fontSize: '12px', 
                        color: colors.textMuted,
                        marginBottom: '12px',
                      }}>
                        Animated background with floating orbs
                      </p>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                      }}>
                        <span style={{ fontSize: '13px', color: colors.text }}>
                          Glass Intensity
                        </span>
                        <input
                          type="range"
                          min="0.02"
                          max="0.15"
                          step="0.01"
                          value={preferences.glassIntensity}
                          onChange={(e) => updatePreferences({ glassIntensity: parseFloat(e.target.value) })}
                          style={{
                            flex: 1,
                            height: '4px',
                            borderRadius: '2px',
                            appearance: 'none',
                            background: `linear-gradient(to right, ${colors.accent} 0%, ${colors.accent} ${((preferences.glassIntensity - 0.02) / 0.13) * 100}%, ${isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'} ${((preferences.glassIntensity - 0.02) / 0.13) * 100}%, ${isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'} 100%)`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <SettingsRow
            icon={<HiOutlineBell size={18} />}
            iconColor="#f59e0b"
            label="Motion Effects"
            toggle
            toggleValue={true}
            onToggle={() => {}}
            isLast
          />
        </SettingsSection>
      </motion.div>

      {/* Notifications Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <SettingsSection title="Notifications">
          <SettingsRow
            icon={<HiOutlineBell size={18} />}
            iconColor="#3b82f6"
            label="Push Notifications"
            toggle
            toggleValue={notifications}
            onToggle={setNotifications}
          />
          <SettingsRow
            icon={<HiOutlineCamera size={18} />}
            iconColor="#22c55e"
            label="Motion Alerts"
            toggle
            toggleValue={motionAlerts}
            onToggle={setMotionAlerts}
          />
          <SettingsRow
            icon={<HiOutlineBell size={18} />}
            iconColor="#ef4444"
            label="Sound Alerts"
            toggle
            toggleValue={soundAlerts}
            onToggle={setSoundAlerts}
            isLast
          />
        </SettingsSection>
      </motion.div>

      {/* System Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <SettingsSection title="System">
          <SettingsRow
            icon={<HiOutlineVideoCamera size={18} />}
            iconColor="#00d4ff"
            label="Camera Management"
            onClick={() => navigate('/cameras')}
          />
          <SettingsRow
            icon={<HiOutlineShieldCheck size={18} />}
            iconColor="#22c55e"
            label="Security Settings"
            onClick={() => {}}
          />
          <SettingsRow
            icon={<HiOutlineWifi size={18} />}
            iconColor="#3b82f6"
            label="Network Settings"
            onClick={() => {}}
          />
          <SettingsRow
            icon={<HiOutlineDatabase size={18} />}
            iconColor="#8b5cf6"
            label="Storage"
            value="Manage"
            onClick={() => navigate('/storage')}
            isLast
          />
        </SettingsSection>
      </motion.div>

      {/* App Info */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        style={{ 
          textAlign: 'center',
          marginTop: '32px',
        }}
      >
        <p style={{ 
          fontSize: '13px', 
          color: colors.textMuted,
          marginBottom: '4px',
        }}>
          VigileEye Security
        </p>
        <p style={{ 
          fontSize: '12px', 
          color: colors.textMuted,
          opacity: 0.7,
        }}>
          Version 1.0.0
        </p>
      </motion.div>

      {/* Login History Modal */}
      <AnimatePresence>
        {showLoginHistory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowLoginHistory(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.7)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              zIndex: 2000,
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center',
            }}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: '500px',
                maxHeight: '85vh',
                background: isDark ? 'rgba(25, 25, 40, 0.98)' : 'rgba(255, 255, 255, 0.98)',
                borderRadius: '24px 24px 0 0',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Modal Header */}
              <div style={{
                padding: '20px',
                borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <div>
                  <h2 style={{ fontSize: '20px', fontWeight: 700, color: colors.text, marginBottom: '4px' }}>
                    Login History
                  </h2>
                  <p style={{ fontSize: '13px', color: colors.textMuted }}>
                    {loginHistoryLoading ? 'Loading...' : `${filteredLoginHistory.length} of ${loginHistory.length} sessions`}
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <motion.button
                    whileHover={{ scale: 1.1, rotate: 180 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => fetchLoginHistory()}
                    disabled={loginHistoryLoading}
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: loginHistoryLoading ? 'not-allowed' : 'pointer',
                      color: colors.accent,
                      opacity: loginHistoryLoading ? 0.5 : 1,
                    }}
                  >
                    <HiOutlineRefresh size={18} />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setShowLoginHistory(false)}
                    style={{
                      width: '36px',
                      height: '36px',
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
                    <HiOutlineX size={20} />
                  </motion.button>
                </div>
              </div>

              {/* Security Warning */}
              {hasSuspiciousLogins && (
                <div style={{
                  margin: '16px 16px 0',
                  padding: '14px 16px',
                  borderRadius: '14px',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                }}>
                  <HiOutlineExclamation size={24} color="#ef4444" style={{ flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: '#ef4444', marginBottom: '4px' }}>
                      Suspicious Activity Detected
                    </p>
                    <p style={{ fontSize: '12px', color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)', marginBottom: '10px' }}>
                      We noticed some unusual login attempts. If you don't recognize these, change your password immediately.
                    </p>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setShowLoginHistory(false);
                        navigate('/forgot-password');
                      }}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '10px',
                        background: '#ef4444',
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
                      <HiOutlineLockClosed size={14} />
                      Go to Reset Password
                    </motion.button>
                  </div>
                </div>
              )}

              {/* Search and Filters */}
              <div style={{ padding: '16px', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}` }}>
                {/* Search Input */}
                <div style={{ position: 'relative', marginBottom: '12px' }}>
                  <HiOutlineSearch 
                    size={18} 
                    color={colors.textMuted} 
                    style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }}
                  />
                  <input
                    type="text"
                    placeholder="Search by location, device, IP..."
                    value={loginHistorySearch}
                    onChange={(e) => setLoginHistorySearch(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 12px 12px 42px',
                      borderRadius: '12px',
                      background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                      border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                      color: colors.text,
                      fontSize: '14px',
                      outline: 'none',
                    }}
                  />
                </div>

                {/* Filter Pills */}
                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                  {/* Date Filter */}
                  <select
                    value={loginHistoryDateFilter}
                    onChange={(e) => setLoginHistoryDateFilter(e.target.value as any)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '10px',
                      background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                      border: loginHistoryDateFilter !== 'all' ? `1px solid ${colors.accent}40` : '1px solid transparent',
                      color: loginHistoryDateFilter !== 'all' ? colors.accent : colors.text,
                      fontSize: '13px',
                      cursor: 'pointer',
                      outline: 'none',
                    }}
                  >
                    <option value="all">All Time</option>
                    <option value="7days">Last 7 Days</option>
                    <option value="30days">Last 30 Days</option>
                    <option value="90days">Last 90 Days</option>
                  </select>

                  {/* Device Filter */}
                  <select
                    value={loginHistoryDeviceFilter}
                    onChange={(e) => setLoginHistoryDeviceFilter(e.target.value as any)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '10px',
                      background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                      border: loginHistoryDeviceFilter !== 'all' ? `1px solid ${colors.accent}40` : '1px solid transparent',
                      color: loginHistoryDeviceFilter !== 'all' ? colors.accent : colors.text,
                      fontSize: '13px',
                      cursor: 'pointer',
                      outline: 'none',
                    }}
                  >
                    <option value="all">All Devices</option>
                    <option value="desktop">Desktop</option>
                    <option value="mobile">Mobile</option>
                    <option value="tablet">Tablet</option>
                  </select>
                </div>
              </div>

              {/* Login History List */}
              <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '8px 16px 100px',
              }}>
                {loginHistoryLoading ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '60px 20px',
                    color: colors.textMuted,
                  }}>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                    >
                      <HiOutlineRefresh size={40} style={{ opacity: 0.4 }} />
                    </motion.div>
                    <p style={{ marginTop: '12px' }}>Loading login history...</p>
                  </div>
                ) : loginHistoryError ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '40px 20px',
                    color: '#ef4444',
                  }}>
                    <HiOutlineExclamation size={40} style={{ opacity: 0.6, marginBottom: '12px' }} />
                    <p>{loginHistoryError}</p>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => fetchLoginHistory()}
                      style={{
                        marginTop: '16px',
                        padding: '10px 20px',
                        borderRadius: '10px',
                        background: colors.accent,
                        border: 'none',
                        color: '#fff',
                        fontSize: '14px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Try Again
                    </motion.button>
                  </div>
                ) : filteredLoginHistory.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '40px 20px',
                    color: colors.textMuted,
                  }}>
                    <HiOutlineSearch size={40} style={{ opacity: 0.4, marginBottom: '12px' }} />
                    <p>No login sessions found</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {filteredLoginHistory.map((entry, index) => (
                      <motion.div
                        key={entry.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                        style={{
                          padding: '14px',
                          borderRadius: '14px',
                          background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                          border: entry.isSuspicious 
                            ? '1px solid rgba(239, 68, 68, 0.4)' 
                            : `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}`,
                        }}
                      >
                        <div style={{ display: 'flex', gap: '12px' }}>
                          {/* Device Icon */}
                          <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '12px',
                            background: entry.isSuspicious 
                              ? 'rgba(239, 68, 68, 0.15)' 
                              : entry.success 
                              ? 'rgba(34, 197, 94, 0.15)' 
                              : 'rgba(239, 68, 68, 0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: entry.isSuspicious || !entry.success ? '#ef4444' : '#22c55e',
                            flexShrink: 0,
                          }}>
                            {getDeviceIcon(entry.deviceType)}
                          </div>

                          {/* Details */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                              <span style={{ 
                                fontSize: '14px', 
                                fontWeight: 600, 
                                color: colors.text,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}>
                                {entry.device}
                              </span>
                              {entry.isSuspicious && (
                                <span style={{
                                  fontSize: '10px',
                                  padding: '2px 6px',
                                  borderRadius: '6px',
                                  background: 'rgba(239, 68, 68, 0.2)',
                                  color: '#ef4444',
                                  fontWeight: 600,
                                }}>
                                  SUSPICIOUS
                                </span>
                              )}
                              {!entry.success && (
                                <span style={{
                                  fontSize: '10px',
                                  padding: '2px 6px',
                                  borderRadius: '6px',
                                  background: 'rgba(239, 68, 68, 0.2)',
                                  color: '#ef4444',
                                  fontWeight: 600,
                                }}>
                                  FAILED
                                </span>
                              )}
                            </div>
                            <div style={{ 
                              fontSize: '12px', 
                              color: colors.textMuted, 
                              display: 'flex',
                              flexWrap: 'wrap',
                              gap: '8px',
                            }}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <HiOutlineGlobeAlt size={12} />
                                {entry.location}
                              </span>
                              <span>•</span>
                              <span>{entry.ipAddress}</span>
                            </div>
                            <div style={{ 
                              fontSize: '11px', 
                              color: colors.textMuted, 
                              marginTop: '4px',
                              opacity: 0.8,
                            }}>
                              {entry.browser} • {entry.os}
                            </div>
                          </div>

                          {/* Timestamp */}
                          <div style={{ 
                            fontSize: '12px', 
                            color: colors.textMuted,
                            textAlign: 'right',
                            flexShrink: 0,
                          }}>
                            {formatLoginDate(entry.timestamp)}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
