import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AnimatedBackground } from './components/AnimatedBackground';
import { TabBar } from './components/TabBar';

// Import pages from organized structure
import {
  // Auth pages
  OnboardingPage,
  LoginPage,
  RegisterPage,
  VerifyOTPPage,
  ForgotPasswordPage,
  AuthCallbackPage,
  PermissionsPage,
  // Core pages
  DashboardPageNew,
  SettingsPageNew,
  AlertsPageNew,
  ZonesPageNew,
  // Camera management
  CameraManagementPage,
  // Streaming
  MonitoringPageNew,
  // Members
  MembersPageNew,
  // Storage
  StoragePageNew,
} from './pages';

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isFirstTime } = useAuth();
  
  if (isFirstTime) {
    return <Navigate to="/onboarding" replace />;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

// Auth Route - redirects to dashboard if already logged in
const AuthRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isFirstTime } = useAuth();
  
  if (isFirstTime) {
    return <Navigate to="/onboarding" replace />;
  }
  
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
};

// Main App Layout with TabBar and Background (for authenticated routes)
const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div style={{ 
      minHeight: '100vh',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <AnimatedBackground />
      <div style={{ 
        position: 'relative', 
        zIndex: 1,
        minHeight: '100vh',
        paddingBottom: 'calc(85px + env(safe-area-inset-bottom, 0px))',
      }}>
        {children}
      </div>
      <TabBar />
    </div>
  );
};

// App Routes Component
const AppRoutes: React.FC = () => {
  const { isFirstTime } = useAuth();
  
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/onboarding" element={<OnboardingPage />} />
      <Route path="/login" element={
        <AuthRoute>
          <LoginPage />
        </AuthRoute>
      } />
      <Route path="/register" element={
        <AuthRoute>
          <RegisterPage />
        </AuthRoute>
      } />
      <Route path="/verify-otp" element={<VerifyOTPPage />} />
      <Route path="/forgot-password" element={
        <AuthRoute>
          <ForgotPasswordPage />
        </AuthRoute>
      } />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route path="/permissions" element={<PermissionsPage />} />
      
      {/* Protected Routes */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <AppLayout>
            <DashboardPageNew />
          </AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/monitoring" element={
        <ProtectedRoute>
          <AppLayout>
            <MonitoringPageNew />
          </AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/monitoring/:id" element={
        <ProtectedRoute>
          <AppLayout>
            <MonitoringPageNew />
          </AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/zones" element={
        <ProtectedRoute>
          <AppLayout>
            <ZonesPageNew />
          </AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/alerts" element={
        <ProtectedRoute>
          <AppLayout>
            <AlertsPageNew />
          </AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/members" element={
        <ProtectedRoute>
          <AppLayout>
            <MembersPageNew />
          </AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/groups" element={<Navigate to="/members" replace />} />
      <Route path="/settings" element={
        <ProtectedRoute>
          <AppLayout>
            <SettingsPageNew />
          </AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/cameras" element={
        <ProtectedRoute>
          <AppLayout>
            <CameraManagementPage />
          </AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/storage" element={
        <ProtectedRoute>
          <AppLayout>
            <StoragePageNew />
          </AppLayout>
        </ProtectedRoute>
      } />
      
      {/* Default Route */}
      <Route path="/" element={
        isFirstTime ? <Navigate to="/onboarding" replace /> : <Navigate to="/dashboard" replace />
      } />
      
      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <AppRoutes />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
