/**
 * Pages Module
 * Re-exports all page components organized by feature
 */

// Auth pages
export {
  LoginPage,
  RegisterPage,
  ForgotPasswordPage,
  VerifyOTPPage,
  AuthCallbackPage,
  OnboardingPage,
  PermissionsPage,
} from './auth';

// Core app pages
export {
  DashboardPageNew,
  SettingsPageNew,
  AlertsPageNew,
  ZonesPageNew,
} from './core';

// Camera management
export { CameraManagementPage } from './cameras';

// Streaming/monitoring
export { MonitoringPageNew } from './streaming';

// Members
export { MembersPageNew } from './members';

// Storage
export { StoragePageNew } from './storage';
