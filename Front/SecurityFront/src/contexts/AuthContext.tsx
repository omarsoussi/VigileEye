import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi, tokenStorage, ApiError, UserResponse } from '../services/api';

interface User {
  id: string;
  username: string;
  email: string;
  is_verified?: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isFirstTime: boolean;
  pendingEmail: string | null;
  authStep: 'idle' | 'awaiting_email_verification' | 'awaiting_2fa' | 'awaiting_password_reset';
  // Auth actions
  login: (email: string, password: string) => Promise<{ success: boolean; message: string; requiresOtp?: boolean }>;
  confirmLogin: (email: string, otpCode: string) => Promise<{ success: boolean; message: string }>;
  register: (username: string, email: string, password: string) => Promise<{ success: boolean; message: string; requiresVerification?: boolean }>;
  verifyEmail: (email: string, otpCode: string) => Promise<{ success: boolean; message: string }>;
  forgotPassword: (email: string) => Promise<{ success: boolean; message: string }>;
  resetPassword: (email: string, otpCode: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
  loginWithGoogle: () => Promise<boolean>;
  logout: () => void;
  completeOnboarding: () => void;
  setPendingEmail: (email: string | null) => void;
  setAuthStep: (step: 'idle' | 'awaiting_email_verification' | 'awaiting_2fa' | 'awaiting_password_reset') => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('vigileye-user');
    return saved ? JSON.parse(saved) : null;
  });
  
  const [isFirstTime, setIsFirstTime] = useState<boolean>(() => {
    return localStorage.getItem('vigileye-onboarding-complete') !== 'true';
  });

  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [authStep, setAuthStep] = useState<'idle' | 'awaiting_email_verification' | 'awaiting_2fa' | 'awaiting_password_reset'>('idle');

  useEffect(() => {
    if (user) {
      localStorage.setItem('vigileye-user', JSON.stringify(user));
    } else {
      localStorage.removeItem('vigileye-user');
    }
  }, [user]);

  // Auto refresh token on app load
  useEffect(() => {
    const refreshToken = tokenStorage.getRefreshToken();
    if (refreshToken && user) {
      authApi.refreshTokens({ refresh_token: refreshToken })
        .then((response) => {
          tokenStorage.setTokens(response.access_token, response.refresh_token);
        })
        .catch(() => {
          // Token refresh failed, logout user
          logout();
        });
    }
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; message: string; requiresOtp?: boolean }> => {
    try {
      const response = await authApi.login({ email, password });
      if (response.success) {
        setPendingEmail(email);
        setAuthStep('awaiting_2fa');
        return { success: true, message: response.message, requiresOtp: true };
      }
      return { success: false, message: response.message };
    } catch (error) {
      const apiError = error as ApiError;
      return { success: false, message: apiError.message || 'Login failed' };
    }
  };

  const confirmLogin = async (email: string, otpCode: string): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await authApi.confirmLogin({ email, otp_code: otpCode });
      // Store tokens
      tokenStorage.setTokens(response.tokens.access_token, response.tokens.refresh_token);
      // Set user
      setUser({
        id: response.user.id,
        username: response.user.username,
        email: response.user.email,
        is_verified: response.user.is_verified,
      });
      setPendingEmail(null);
      setAuthStep('idle');
      return { success: true, message: response.message };
    } catch (error) {
      const apiError = error as ApiError;
      return { success: false, message: apiError.message || 'OTP verification failed' };
    }
  };

  const register = async (username: string, email: string, password: string): Promise<{ success: boolean; message: string; requiresVerification?: boolean }> => {
    try {
      const response = await authApi.register({ email, username, password });
      if (response.success) {
        setPendingEmail(email);
        setAuthStep('awaiting_email_verification');
        return { success: true, message: response.message, requiresVerification: true };
      }
      return { success: false, message: response.message };
    } catch (error) {
      const apiError = error as ApiError;
      return { success: false, message: apiError.message || 'Registration failed' };
    }
  };

  const verifyEmail = async (email: string, otpCode: string): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await authApi.verifyEmail({ email, otp_code: otpCode });
      if (response.success) {
        setAuthStep('idle');
        return { success: true, message: response.message };
      }
      return { success: false, message: response.message };
    } catch (error) {
      const apiError = error as ApiError;
      return { success: false, message: apiError.message || 'Email verification failed' };
    }
  };

  const forgotPassword = async (email: string): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await authApi.forgotPassword({ email });
      setPendingEmail(email);
      setAuthStep('awaiting_password_reset');
      return { success: true, message: response.message };
    } catch (error) {
      const apiError = error as ApiError;
      return { success: false, message: apiError.message || 'Failed to send reset code' };
    }
  };

  const resetPassword = async (email: string, otpCode: string, newPassword: string): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await authApi.resetPassword({ email, otp_code: otpCode, new_password: newPassword });
      if (response.success) {
        setPendingEmail(null);
        setAuthStep('idle');
        return { success: true, message: response.message };
      }
      return { success: false, message: response.message };
    } catch (error) {
      const apiError = error as ApiError;
      return { success: false, message: apiError.message || 'Password reset failed' };
    }
  };

  const loginWithGoogle = async (): Promise<boolean> => {
    try {
      const response = await authApi.getGoogleAuthUrl();
      // Redirect to Google OAuth
      window.location.href = response.authorization_url;
      return true;
    } catch (error) {
      console.error('Google auth error:', error);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    tokenStorage.clearTokens();
    setPendingEmail(null);
    setAuthStep('idle');
  };

  const completeOnboarding = () => {
    setIsFirstTime(false);
    localStorage.setItem('vigileye-onboarding-complete', 'true');
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isFirstTime,
      pendingEmail,
      authStep,
      login,
      confirmLogin,
      register,
      verifyEmail,
      forgotPassword,
      resetPassword,
      loginWithGoogle,
      logout,
      completeOnboarding,
      setPendingEmail,
      setAuthStep,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
