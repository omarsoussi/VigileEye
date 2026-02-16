import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { GlassCard } from '../../components/GlassCard';
import { AnimatedBackground } from '../../components/AnimatedBackground';
import { 
  HiOutlineArrowLeft,
  HiOutlineArrowRight,
  HiOutlineMail,
} from 'react-icons/hi';

type OTPPurpose = 'email_verification' | 'login_2fa' | 'password_reset';

interface LocationState {
  email?: string;
  purpose?: OTPPurpose;
  newPassword?: string;
}

export const VerifyOTPPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { colors, preferences } = useTheme();
  const { verifyEmail, confirmLogin, resetPassword, pendingEmail } = useAuth();
  const isDark = preferences.mode === 'dark';
  
  const state = location.state as LocationState | null;
  const email = state?.email || pendingEmail || '';
  const purpose: OTPPurpose = state?.purpose || 'email_verification';
  const newPassword = state?.newPassword || '';
  
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Focus first input on mount
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste
      const digits = value.replace(/\D/g, '').slice(0, 6).split('');
      const newOtp = [...otp];
      digits.forEach((digit, i) => {
        if (index + i < 6) {
          newOtp[index + i] = digit;
        }
      });
      setOtp(newOtp);
      const nextIndex = Math.min(index + digits.length, 5);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    if (/^\d*$/.test(value)) {
      const newOtp = [...otp];
      newOtp[index] = value;
      setOtp(newOtp);

      if (value && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const getTitle = () => {
    switch (purpose) {
      case 'email_verification':
        return 'Verify Your Email';
      case 'login_2fa':
        return 'Two-Factor Authentication';
      case 'password_reset':
        return 'Reset Password';
      default:
        return 'Enter OTP';
    }
  };

  const getDescription = () => {
    switch (purpose) {
      case 'email_verification':
        return `We've sent a 6-digit code to ${email}. Enter it below to verify your email.`;
      case 'login_2fa':
        return `Enter the 6-digit code sent to ${email} to complete your login.`;
      case 'password_reset':
        return `Enter the 6-digit code sent to ${email} to reset your password.`;
      default:
        return `Enter the 6-digit code sent to ${email}.`;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      setError('Please enter all 6 digits');
      return;
    }

    setIsLoading(true);

    try {
      let result;
      
      switch (purpose) {
        case 'email_verification':
          result = await verifyEmail(email, otpCode);
          if (result.success) {
            setSuccess('Email verified successfully! You can now login.');
            setTimeout(() => navigate('/login'), 2000);
          } else {
            setError(result.message);
          }
          break;
          
        case 'login_2fa':
          result = await confirmLogin(email, otpCode);
          if (result.success) {
            const permissionsRequested = localStorage.getItem('permissionsRequested');
            if (!permissionsRequested) {
              navigate('/permissions');
            } else {
              navigate('/dashboard');
            }
          } else {
            setError(result.message);
          }
          break;
          
        case 'password_reset':
          result = await resetPassword(email, otpCode, newPassword);
          if (result.success) {
            setSuccess('Password reset successfully! You can now login.');
            setTimeout(() => navigate('/login'), 2000);
          } else {
            setError(result.message);
          }
          break;
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
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
      <AnimatedBackground />
      
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
          onClick={() => navigate(-1)}
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
          Back
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
            <HiOutlineMail size={36} color={colors.accent} />
          </motion.div>
          
          <h1 style={{
            fontSize: '28px',
            fontWeight: 700,
            color: colors.text,
            marginBottom: '8px',
            letterSpacing: '-0.5px',
          }}>
            {getTitle()}
          </h1>
          <p style={{
            fontSize: '14px',
            color: colors.textSecondary,
            lineHeight: '1.5',
            maxWidth: '320px',
            margin: '0 auto',
          }}>
            {getDescription()}
          </p>
        </motion.div>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
          <div dangerouslySetInnerHTML={{ __html: '<dotlottie-player src="https://lottie.host/ac1c6b92-0945-4566-a0ed-57b0faf96701/WjOQ2Ay1Iw.lottie" style="width: 200px;height: 200px" autoplay loop></dotlottie-player>' }} />
        </div>

        {/* OTP Form */}
        <GlassCard padding="32px" borderRadius="28px" variant="elevated">
          <form onSubmit={handleSubmit}>
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

            {/* OTP Input */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '12px',
              marginBottom: '32px',
            }}>
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  style={{
                    width: '48px',
                    height: '56px',
                    borderRadius: '12px',
                    border: `2px solid ${digit ? colors.accent : isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'}`,
                    background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                    color: colors.text,
                    fontSize: '24px',
                    fontWeight: 600,
                    textAlign: 'center',
                    outline: 'none',
                    transition: 'all 0.2s',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = colors.accent;
                    e.target.style.boxShadow = `0 0 0 3px ${colors.accent}20`;
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = digit ? colors.accent : isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              ))}
            </div>

            {/* Submit Button */}
            <motion.button
              type="submit"
              disabled={isLoading || otp.join('').length !== 6}
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
                cursor: isLoading || otp.join('').length !== 6 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: `0 10px 30px ${colors.accent}40`,
                opacity: isLoading || otp.join('').length !== 6 ? 0.7 : 1,
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
                  Verify Code
                  <HiOutlineArrowRight size={20} />
                </>
              )}
            </motion.button>

            {/* Resend Code */}
            <p style={{
              textAlign: 'center',
              marginTop: '24px',
              fontSize: '14px',
              color: colors.textSecondary,
            }}>
              Didn't receive the code?{' '}
              <button
                type="button"
                onClick={() => {
                  // TODO: Implement resend functionality
                  setError('');
                  setSuccess('A new code has been sent to your email.');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: colors.accent,
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '14px',
                }}
              >
                Resend
              </button>
            </p>
          </form>
        </GlassCard>
      </motion.div>
    </div>
  );
};
