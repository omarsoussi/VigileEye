import React, { ReactNode } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext';

interface GlassCardProps extends HTMLMotionProps<'div'> {
  children: ReactNode;
  variant?: 'default' | 'elevated' | 'inset';
  padding?: string;
  borderRadius?: string;
  noBorder?: boolean;
  glowColor?: string;
  className?: string;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  variant = 'default',
  padding = '20px',
  borderRadius = '20px',
  noBorder = false,
  glowColor,
  className,
  style,
  ...motionProps
}) => {
  const { preferences, colors } = useTheme();
  const intensity = preferences.glassIntensity || 0.1;
  const isDark = preferences.mode === 'dark';

  const getBackground = () => {
    switch (variant) {
      case 'elevated':
        return isDark 
          ? `rgba(255, 255, 255, ${intensity * 1.5})`
          : `rgba(255, 255, 255, 0.9)`;
      case 'inset':
        return isDark 
          ? `rgba(0, 0, 0, 0.3)`
          : `rgba(0, 0, 0, 0.03)`;
      default:
        return isDark 
          ? `rgba(255, 255, 255, ${intensity})`
          : `rgba(255, 255, 255, 0.8)`;
    }
  };

  const getBorder = () => {
    if (noBorder) return 'none';
    return isDark
      ? `1px solid rgba(255, 255, 255, ${intensity * 0.8})`
      : `1px solid rgba(0, 0, 0, 0.08)`;
  };

  const getBoxShadow = () => {
    const shadows = [];
    
    if (variant === 'elevated') {
      shadows.push(isDark 
        ? '0 20px 60px rgba(0, 0, 0, 0.5), 0 8px 20px rgba(0, 0, 0, 0.3)'
        : '0 20px 60px rgba(0, 0, 0, 0.1), 0 8px 20px rgba(0, 0, 0, 0.05)');
    } else if (variant === 'inset') {
      shadows.push('inset 0 2px 10px rgba(0, 0, 0, 0.1)');
    } else {
      shadows.push(isDark 
        ? '0 8px 32px rgba(0, 0, 0, 0.3)'
        : '0 8px 32px rgba(0, 0, 0, 0.08)');
    }

    if (glowColor) {
      shadows.push(`0 0 40px ${glowColor}30`);
    }

    return shadows.join(', ');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={{ scale: 1.01, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.99 }}
      className={className}
      style={{
        background: getBackground(),
        backdropFilter: 'blur(40px)',
        WebkitBackdropFilter: 'blur(40px)',
        borderRadius,
        border: getBorder(),
        boxShadow: getBoxShadow(),
        padding,
        ...style,
      }}
      {...motionProps}
    >
      {children}
    </motion.div>
  );
};

// Utility component for animated list items
interface AnimatedListItemProps extends HTMLMotionProps<'div'> {
  children: ReactNode;
  index?: number;
}

export const AnimatedListItem: React.FC<AnimatedListItemProps> = ({
  children,
  index = 0,
  ...props
}) => (
  <motion.div
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ 
      duration: 0.3, 
      delay: index * 0.05,
      ease: [0.25, 0.46, 0.45, 0.94] 
    }}
    {...props}
  >
    {children}
  </motion.div>
);

// Animated button component
interface AnimatedButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
}

export const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  icon,
}) => {
  const { colors, preferences } = useTheme();
  const isDark = preferences.mode === 'dark';

  const getStyles = (): React.CSSProperties => {
    const baseStyles: React.CSSProperties = {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      border: 'none',
      borderRadius: size === 'lg' ? '16px' : '12px',
      fontWeight: 600,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      width: fullWidth ? '100%' : 'auto',
      fontFamily: 'inherit',
      transition: 'all 0.2s ease',
    };

    const sizeStyles = {
      sm: { padding: '8px 16px', fontSize: '13px' },
      md: { padding: '12px 24px', fontSize: '14px' },
      lg: { padding: '16px 32px', fontSize: '16px' },
    };

    const variantStyles = {
      primary: {
        background: `linear-gradient(135deg, ${colors.accent} 0%, ${colors.accent}cc 100%)`,
        color: '#ffffff',
        boxShadow: `0 4px 20px ${colors.accent}40`,
      },
      secondary: {
        background: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
        color: colors.text,
        border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)'}`,
      },
      ghost: {
        background: 'transparent',
        color: colors.accent,
      },
      danger: {
        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
        color: '#ffffff',
        boxShadow: '0 4px 20px rgba(239, 68, 68, 0.4)',
      },
    };

    return { ...baseStyles, ...sizeStyles[size], ...variantStyles[variant] };
  };

  return (
    <motion.button
      onClick={disabled ? undefined : onClick}
      style={getStyles()}
      whileHover={disabled ? {} : { scale: 1.02, y: -2 }}
      whileTap={disabled ? {} : { scale: 0.98 }}
      transition={{ duration: 0.15 }}
    >
      {icon}
      {children}
    </motion.button>
  );
};

// Toggle Switch Component - iOS Style
interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  size?: 'sm' | 'md';
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  checked,
  onChange,
  size = 'md',
}) => {
  const { colors } = useTheme();
  
  // iOS-style dimensions - consistent across all devices
  const sizeMap = {
    sm: { width: 46, height: 28, knobSize: 24, padding: 2 },
    md: { width: 51, height: 31, knobSize: 27, padding: 2 },
  };
  
  const { width, height, knobSize, padding } = sizeMap[size];

  return (
    <motion.button
      onClick={() => onChange(!checked)}
      style={{
        width,
        height,
        borderRadius: height,
        background: checked 
          ? colors.accent
          : 'rgba(120, 120, 128, 0.32)',
        border: 'none',
        cursor: 'pointer',
        position: 'relative',
        padding: 0,
        outline: 'none',
        WebkitTapHighlightColor: 'transparent',
        flexShrink: 0,
      }}
      whileTap={{ scale: 0.95 }}
      transition={{ duration: 0.1 }}
    >
      <motion.div
        animate={{
          x: checked ? width - knobSize - padding : padding,
        }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        style={{
          width: knobSize,
          height: knobSize,
          borderRadius: '50%',
          background: '#ffffff',
          boxShadow: '0 3px 8px rgba(0, 0, 0, 0.15), 0 1px 3px rgba(0, 0, 0, 0.1)',
          position: 'absolute',
          top: padding,
          left: 0,
        }}
      />
    </motion.button>
  );
};
