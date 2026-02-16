import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { GlassCard } from '../../components/GlassCard';
import { AnimatedBackground } from '../../components/AnimatedBackground';
import { 
  HiOutlineMail,
  HiOutlineLockClosed,
  HiOutlineEye,
  HiOutlineEyeOff,
  HiOutlineArrowRight,
} from 'react-icons/hi';
import { FcGoogle } from 'react-icons/fc';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { colors, preferences } = useTheme();
  const { login, loginWithGoogle, setPendingEmail } = useAuth();
  const isDark = preferences.mode === 'dark';
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await login(email, password);
      if (result.success && result.requiresOtp) {
        // Navigate to OTP verification for 2FA
        navigate('/verify-otp', {
          state: {
            email,
            purpose: 'login_2fa',
          },
        });
      } else if (!result.success) {
        setError(result.message);
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      await loginWithGoogle();
      // Google OAuth will redirect, so no navigation needed here
    } catch (err) {
      setError('Google login failed');
      setIsLoading(false);
    }
  };

  const handleForgotPassword = (e: React.MouseEvent) => {
    e.preventDefault();
    navigate('/forgot-password');
  };

  return (
    <div style={{
      minHeight: '100vh',
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    }}>
      <video
        autoPlay
        muted
        loop
        playsInline
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          zIndex: 0,
        }}
      >
        <source src="/Videos/VidBG.mp4" type="video/mp4" />
      </video>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{
          width: '100%',
          maxWidth: '400px',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Logo and Title */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          style={{
            textAlign: 'center',
            marginBottom: '40px',
          }}
        >
          <motion.img
            src="/UI Gifs/Auth/Login.gif"
            alt="VigileEye"
            style={{
             width: '120px',
              height: '120px',
              objectFit: 'contain',
              margin: '0 auto 20px',
              display: 'block',
            }}
          />
          
          <h1 style={{
            fontSize: '32px',
            fontWeight: 700,
            color: colors.text,
            marginBottom: '8px',
            letterSpacing: '-0.5px',
          }}>
            Welcome Back
          </h1>
          <p style={{
            fontSize: '16px',
            color: colors.textSecondary,
          }}>
            Sign in to VigileEye
          </p>
        </motion.div>

        {/* Login Form */}
        <GlassCard padding="32px" borderRadius="28px" variant="elevated">
          <form onSubmit={handleLogin}>
            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  padding: '12px 16px',
                  borderRadius: '12px',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#ef4444',
                  fontSize: '14px',
                  marginBottom: '20px',
                  textAlign: 'center',
                }}
              >
                {error}
              </motion.div>
            )}

            {/* Email Input */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 600,
                color: colors.text,
                marginBottom: '8px',
              }}>
                Email
              </label>
              <div style={{
                position: 'relative',
              }}>
                <HiOutlineMail 
                  size={20} 
                  style={{
                    position: 'absolute',
                    left: '16px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: colors.textMuted,
                  }}
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  style={{
                    width: '100%',
                    padding: '16px 16px 16px 48px',
                    borderRadius: '14px',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                    background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                    color: colors.text,
                    fontSize: '16px',
                    outline: 'none',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = colors.accent;
                    e.target.style.boxShadow = `0 0 0 3px ${colors.accent}20`;
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>

            {/* Password Input */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 600,
                color: colors.text,
                marginBottom: '8px',
              }}>
                Password
              </label>
              <div style={{
                position: 'relative',
              }}>
                <HiOutlineLockClosed 
                  size={20} 
                  style={{
                    position: 'absolute',
                    left: '16px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: colors.textMuted,
                  }}
                />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  style={{
                    width: '100%',
                    padding: '16px 48px 16px 48px',
                    borderRadius: '14px',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                    background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                    color: colors.text,
                    fontSize: '16px',
                    outline: 'none',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = colors.accent;
                    e.target.style.boxShadow = `0 0 0 3px ${colors.accent}20`;
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '16px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: colors.textMuted,
                  }}
                >
                  {showPassword ? <HiOutlineEyeOff size={20} /> : <HiOutlineEye size={20} />}
                </button>
              </div>
            </div>

            {/* Forgot Password */}
            <div style={{
              textAlign: 'right',
              marginBottom: '24px',
            }}>
              <button
                type="button"
                onClick={handleForgotPassword}
                style={{
                  fontSize: '14px',
                  color: colors.accent,
                  textDecoration: 'none',
                  fontWeight: 500,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Forgot Password?
              </button>
            </div>

            {/* Login Button */}
            <motion.button
              type="submit"
              disabled={isLoading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: '14px',
                border: 'none',
                background: `linear-gradient(135deg, ${colors.accent} 0%, ${colors.accent}cc 100%)`,
                color: '#fff',
                fontSize: '16px',
                fontWeight: 600,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: `0 10px 30px ${colors.accent}40`,
                opacity: isLoading ? 0.7 : 1,
              }}
            >
              {isLoading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  style={{
                    width: '20px',
                    height: '20px',
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: '#fff',
                    borderRadius: '50%',
                  }}
                />
              ) : (
                <>
                  Log in
                  <HiOutlineArrowRight size={20} />
                </>
              )}
            </motion.button>

            {/* Divider */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              margin: '24px 0',
            }}>
              <div style={{
                flex: 1,
                height: '1px',
                background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
              }} />
              <span style={{
                fontSize: '14px',
                color: colors.textMuted,
              }}>
                or continue with
              </span>
              <div style={{
                flex: 1,
                height: '1px',
                background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
              }} />
            </div>

            {/* Google Login */}
            <motion.button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '14px',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'}`,
                background: isDark ? 'rgba(255,255,255,0.05)' : '#fff',
                color: colors.text,
                fontSize: '15px',
                fontWeight: 600,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
              }}
            >
              <FcGoogle size={22} />
              Continue with Google
            </motion.button>
          </form>
        </GlassCard>

        {/* Register Link */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          style={{
            textAlign: 'center',
            marginTop: '24px',
            fontSize: '15px',
            color: colors.textSecondary,
          }}
        >
          Don't have an account?{' '}
          <Link
            to="/register"
            style={{
              color: colors.accent,
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            Sign Up
          </Link>
        </motion.p>
      </motion.div>
    </div>
  );
};
