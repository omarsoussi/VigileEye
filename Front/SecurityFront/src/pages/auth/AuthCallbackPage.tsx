import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { tokenStorage } from '../../services/api';
import { AnimatedBackground } from '../../components/AnimatedBackground';
import { GlassCard } from '../../components/GlassCard';

export const AuthCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { colors } = useTheme();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Processing authentication...');

  useEffect(() => {
    const handleCallback = async () => {
      const accessToken = searchParams.get('access_token');
      const refreshToken = searchParams.get('refresh_token');
      const error = searchParams.get('error');
      const isNewUser = searchParams.get('is_new_user') === 'true';

      if (error) {
        setStatus('error');
        setMessage('Authentication failed. Please try again.');
        setTimeout(() => navigate('/login'), 3000);
        return;
      }

      if (accessToken && refreshToken) {
        // Store tokens
        tokenStorage.setTokens(accessToken, refreshToken);
        
        setStatus('success');
        setMessage(isNewUser ? 'Account created successfully!' : 'Login successful!');
        
        // Redirect after a short delay
        setTimeout(() => {
          const permissionsRequested = localStorage.getItem('permissionsRequested');
          if (!permissionsRequested) {
            navigate('/permissions');
          } else {
            navigate('/dashboard');
          }
        }, 1500);
      } else {
        setStatus('error');
        setMessage('Invalid authentication response.');
        setTimeout(() => navigate('/login'), 3000);
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  return (
    <div style={{
      minHeight: '100vh',
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    }}>
      <AnimatedBackground />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        style={{
          width: '100%',
          maxWidth: '400px',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <GlassCard padding="40px" borderRadius="28px" variant="elevated">
          <div style={{ textAlign: 'center' }}>
            {status === 'processing' && (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                style={{
                  width: '50px',
                  height: '50px',
                  border: `3px solid ${colors.accent}30`,
                  borderTopColor: colors.accent,
                  borderRadius: '50%',
                  margin: '0 auto 24px',
                }}
              />
            )}
            
            {status === 'success' && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  background: 'rgba(34, 197, 94, 0.15)',
                  border: '2px solid rgba(34, 197, 94, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 24px',
                }}
              >
                <span style={{ fontSize: '28px' }}>✓</span>
              </motion.div>
            )}
            
            {status === 'error' && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '2px solid rgba(239, 68, 68, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 24px',
                }}
              >
                <span style={{ fontSize: '28px' }}>✕</span>
              </motion.div>
            )}
            
            <h2 style={{
              fontSize: '20px',
              fontWeight: 600,
              color: colors.text,
              marginBottom: '8px',
            }}>
              {status === 'processing' && 'Authenticating...'}
              {status === 'success' && 'Welcome!'}
              {status === 'error' && 'Authentication Failed'}
            </h2>
            
            <p style={{
              fontSize: '14px',
              color: colors.textSecondary,
            }}>
              {message}
            </p>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
};
