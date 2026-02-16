import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { GlassCard } from '../../components/GlassCard';
import { AnimatedBackground } from '../../components/AnimatedBackground';
import { 
  HiOutlineMail,
  HiOutlineArrowRight,
  HiOutlineArrowLeft,
  HiOutlineLockClosed,
  HiOutlineEye,
  HiOutlineEyeOff,
  HiOutlineCheck,
  HiOutlineX,
} from 'react-icons/hi';

type Step = 'email' | 'new_password';

export const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const { colors, preferences } = useTheme();
  const { forgotPassword } = useAuth();
  const isDark = preferences.mode === 'dark';
  
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const passwordRequirements = [
    { label: 'At least 12 characters', met: newPassword.length >= 12 },
    { label: 'Contains uppercase letter', met: /[A-Z]/.test(newPassword) },
    { label: 'Contains lowercase letter', met: /[a-z]/.test(newPassword) },
    { label: 'Contains a number', met: /\d/.test(newPassword) },
    { label: 'Contains special character', met: /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/~`]/.test(newPassword) },
    { label: 'Passwords match', met: newPassword === confirmPassword && newPassword.length > 0 },
  ];

  const allRequirementsMet = passwordRequirements.every(req => req.met);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await forgotPassword(email);
      if (result.success) {
        setSuccess(result.message);
        setStep('new_password');
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!allRequirementsMet) {
      setError('Please meet all password requirements');
      return;
    }

    // Navigate to OTP page with the new password
    navigate('/verify-otp', {
      state: {
        email,
        purpose: 'password_reset',
        newPassword,
      },
    });
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
        {/* Back Button */}
        <motion.button
          onClick={() => step === 'email' ? navigate('/login') : setStep('email')}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'none',
            border: 'none',
            color: colors.text,
            fontSize: '14px',
            cursor: 'pointer',
            marginBottom: '24px',
            padding: '8px 0',
          }}
        >
          <HiOutlineArrowLeft size={20} />
          {step === 'email' ? 'Back to Login' : 'Back'}
        </motion.button>

        {/* Icon and Title */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          style={{
            textAlign: 'center',
            marginBottom: '32px',
          }}
        >
          <motion.div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${colors.accent}20 0%, ${colors.accent}40 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              border: `2px solid ${colors.accent}40`,
            }}
          >
            {step === 'email' ? (
              <HiOutlineMail size={36} color={colors.accent} />
            ) : (
              <HiOutlineLockClosed size={36} color={colors.accent} />
            )}
          </motion.div>
          
          <h1 style={{
            fontSize: '28px',
            fontWeight: 700,
            color: colors.text,
            marginBottom: '8px',
            letterSpacing: '-0.5px',
          }}>
            {step === 'email' ? 'Forgot Password?' : 'Create New Password'}
          </h1>
          <p style={{
            fontSize: '14px',
            color: colors.textSecondary,
            lineHeight: '1.5',
            maxWidth: '320px',
            margin: '0 auto',
          }}>
            {step === 'email' 
              ? "Enter your email and we'll send you a code to reset your password."
              : 'Create a strong password that meets all requirements.'}
          </p>
        </motion.div>

        {/* Form */}
        <GlassCard padding="32px" borderRadius="28px" variant="elevated">
          {step === 'email' ? (
            <form onSubmit={handleEmailSubmit}>
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

              {/* Success Message */}
              {success && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '12px',
                    background: 'rgba(34, 197, 94, 0.15)',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                    color: '#22c55e',
                    fontSize: '14px',
                    marginBottom: '20px',
                    textAlign: 'center',
                  }}
                >
                  {success}
                </motion.div>
              )}

              {/* Email Input */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: colors.text,
                  marginBottom: '8px',
                }}>
                  Email Address
                </label>
                <div style={{ position: 'relative' }}>
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

              {/* Submit Button */}
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
                    Send Reset Code
                    <HiOutlineArrowRight size={20} />
                  </>
                )}
              </motion.button>
            </form>
          ) : (
            <form onSubmit={handlePasswordSubmit}>
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

              {/* New Password Input */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: colors.text,
                  marginBottom: '8px',
                }}>
                  New Password
                </label>
                <div style={{ position: 'relative' }}>
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
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
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
                      color: colors.textMuted,
                      cursor: 'pointer',
                      padding: '4px',
                    }}
                  >
                    {showPassword ? <HiOutlineEyeOff size={20} /> : <HiOutlineEye size={20} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password Input */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: colors.text,
                  marginBottom: '8px',
                }}>
                  Confirm Password
                </label>
                <div style={{ position: 'relative' }}>
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
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
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
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={{
                      position: 'absolute',
                      right: '16px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: colors.textMuted,
                      cursor: 'pointer',
                      padding: '4px',
                    }}
                  >
                    {showConfirmPassword ? <HiOutlineEyeOff size={20} /> : <HiOutlineEye size={20} />}
                  </button>
                </div>
              </div>

              {/* Password Requirements */}
              <div style={{ marginBottom: '24px' }}>
                {passwordRequirements.map((req, index) => (
                  <div 
                    key={index}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '6px',
                    }}
                  >
                    {req.met ? (
                      <HiOutlineCheck size={16} color="#22c55e" />
                    ) : (
                      <HiOutlineX size={16} color={colors.textMuted} />
                    )}
                    <span style={{
                      fontSize: '12px',
                      color: req.met ? '#22c55e' : colors.textMuted,
                    }}>
                      {req.label}
                    </span>
                  </div>
                ))}
              </div>

              {/* Submit Button */}
              <motion.button
                type="submit"
                disabled={!allRequirementsMet}
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
                  cursor: !allRequirementsMet ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: `0 10px 30px ${colors.accent}40`,
                  opacity: !allRequirementsMet ? 0.7 : 1,
                }}
              >
                Continue
                <HiOutlineArrowRight size={20} />
              </motion.button>
            </form>
          )}
        </GlassCard>

        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
          <div dangerouslySetInnerHTML={{ __html: '<dotlottie-player src="https://lottie.host/ac1c6b92-0945-4566-a0ed-57b0faf96701/WjOQ2Ay1Iw.lottie" style="width: 300px;height: 300px" autoplay loop></dotlottie-player>' }} />
        </div>

        {/* Back to Login Link */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          style={{
            textAlign: 'center',
            marginTop: '24px',
            fontSize: '14px',
            color: colors.textSecondary,
          }}
        >
          Remember your password?{' '}
          <Link
            to="/login"
            style={{
              color: colors.accent,
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            Sign In
          </Link>
        </motion.p>
      </motion.div>
    </div>
  );
};
