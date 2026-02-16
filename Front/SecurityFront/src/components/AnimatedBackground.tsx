import React from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext';

export const AnimatedBackground: React.FC = () => {
  const { preferences, colors } = useTheme();

  if (preferences.backgroundType === 'solid') {
    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: preferences.solidBackgroundColor || colors.background,
          zIndex: -1,
        }}
      />
    );
  }

  if (preferences.backgroundType === 'gradient') {
    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: preferences.backgroundGradient || colors.backgroundGradient,
          zIndex: -1,
        }}
      />
    );
  }

  // Animated background
  const accentColor = preferences.accentColor || colors.accent;
  
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: preferences.mode === 'dark' 
          ? 'linear-gradient(135deg, #0a0a12 0%, #0d0d1a 50%, #0a0a12 100%)'
          : 'linear-gradient(135deg, #E5E5EA 0%, #F2F2F7 50%, #FFFFFF 100%)',
        overflow: 'hidden',
        zIndex: -1,
      }}
    >
      {/* Floating Orbs */}
      <motion.div
        animate={{
          x: [0, 100, 50, 0],
          y: [0, 50, 100, 0],
          scale: [1, 1.2, 1.1, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        style={{
          position: 'absolute',
          top: '10%',
          left: '10%',
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${accentColor}15 0%, transparent 70%)`,
          filter: 'blur(60px)',
        }}
      />
      <motion.div
        animate={{
          x: [0, -80, -40, 0],
          y: [0, 80, 40, 0],
          scale: [1, 1.1, 1.2, 1],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        style={{
          position: 'absolute',
          top: '40%',
          right: '5%',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${preferences.mode === 'dark' ? '#a855f7' : '#5856D6'}12 0%, transparent 70%)`,
          filter: 'blur(80px)',
        }}
      />
      <motion.div
        animate={{
          x: [0, 60, 30, 0],
          y: [0, -60, -30, 0],
          scale: [1, 1.15, 1.05, 1],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        style={{
          position: 'absolute',
          bottom: '10%',
          left: '20%',
          width: '350px',
          height: '350px',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${preferences.mode === 'dark' ? '#22c55e' : '#34C759'}10 0%, transparent 70%)`,
          filter: 'blur(70px)',
        }}
      />

      {/* Subtle grid pattern */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: preferences.mode === 'dark'
            ? `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)`
            : `radial-gradient(circle at 1px 1px, rgba(0,0,0,0.02) 1px, transparent 0)`,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Noise overlay for texture */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: 0.02,
          backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")',
        }}
      />

      {/* Vignette + scanlines (very subtle, VMS-style) */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: 'none',
          opacity: preferences.mode === 'dark' ? 0.22 : 0.08,
          background:
            preferences.mode === 'dark'
              ? 'radial-gradient(1200px 800px at 50% 40%, rgba(0,0,0,0) 0%, rgba(0,0,0,0.55) 100%)'
              : 'radial-gradient(1200px 800px at 50% 40%, rgba(255,255,255,0) 0%, rgba(0,0,0,0.18) 100%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: 'none',
          opacity: preferences.mode === 'dark' ? 0.06 : 0.03,
          backgroundImage:
            preferences.mode === 'dark'
              ? 'repeating-linear-gradient(180deg, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 1px, rgba(255,255,255,0) 2px, rgba(255,255,255,0) 6px)'
              : 'repeating-linear-gradient(180deg, rgba(0,0,0,0.05) 0px, rgba(0,0,0,0.05) 1px, rgba(0,0,0,0) 2px, rgba(0,0,0,0) 6px)',
        }}
      />
    </div>
  );
};
