/**
 * API Service for Backend Communication
 * Handles all authentication API calls to the FastAPI backend
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';
const MEMBERS_API_BASE_URL = process.env.REACT_APP_MEMBERS_API_URL || 'http://localhost:8001/api/v1';
const CAMERAS_API_BASE_URL = process.env.REACT_APP_CAMERAS_API_URL || 'http://localhost:8002/api/v1';
const STREAMING_API_BASE_URL = process.env.REACT_APP_STREAMING_API_URL || 'http://localhost:8003';

// Types
export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface VerifyOTPRequest {
  email: string;
  otp_code: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  email: string;
  otp_code: string;
  new_password: string;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface MessageResponse {
  message: string;
  success: boolean;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface UserResponse {
  id: string;
  email: string;
  username: string;
  is_verified: boolean;
  last_login?: string;
  created_at?: string;
}

export interface AuthResponse {
  user: UserResponse;
  tokens: TokenResponse;
  message: string;
}

export interface GoogleAuthURLResponse {
  authorization_url: string;
}

export interface ApiError {
  message: string;
  error_code: string;
}

// Members service types
export type MemberPermission = 'reader' | 'editor';

export interface CreateMemberInvitationRequest {
  member_email: string;
  permission: MemberPermission;
  camera_ids: string[];
  unlimited: boolean;
  expires_at?: string | null;
}

export interface MemberInvitationResponse {
  id: string;
  inviter_email: string;
  recipient_email: string;
  permission: MemberPermission;
  status: string;
  camera_ids: string[];
  created_at: string;
  expires_at?: string | null;
  unlimited: boolean;
}

export interface AcceptMemberInvitationRequest {
  code: string;
}

// Group types
export interface CreateGroupRequest {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  default_permission?: MemberPermission;
  camera_ids?: string[];
}

export interface UpdateGroupRequest {
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
  default_permission?: MemberPermission;
  camera_ids?: string[];
}

export interface GroupResponse {
  id: string;
  owner_user_id: string;
  name: string;
  description?: string;
  icon: string;
  color: string;
  default_permission: MemberPermission;
  camera_ids: string[];
  member_count: number;
  created_at: string;
  updated_at: string;
}

export interface GroupMemberResponse {
  id: string;
  group_id: string;
  member_email: string;
  member_user_id?: string;
  access: MemberPermission;
  status: string;
  created_at: string;
  handled_at?: string;
}

export interface GroupDetailResponse extends GroupResponse {
  members: GroupMemberResponse[];
}

export interface InviteGroupMemberRequest {
  email: string;
  access?: MemberPermission;
}

export interface BulkInviteGroupMembersRequest {
  emails: string[];
  access?: MemberPermission;
}

export interface BulkInviteResultResponse {
  invited: string[];
  skipped: string[];
  message: string;
}

export interface AcceptGroupInvitationRequest {
  code: string;
}

export interface ReceivedGroupInvitation {
  id: string;            // group_member id
  group_id: string;
  group_name: string;
  inviter_email: string;
  member_email: string;
  permission: MemberPermission;
  status: string;
  camera_ids: string[];
  created_at: string;
  handled_at?: string | null;
}

// Login History types
export interface LoginHistoryEntry {
  id: string;
  timestamp: string;
  ip_address: string;
  user_agent?: string;
  device_type: 'desktop' | 'mobile' | 'tablet';
  browser?: string;
  os?: string;
  location?: string;
  success: boolean;
  is_suspicious: boolean;
  failure_reason?: string;
}

export interface LoginHistoryListResponse {
  items: LoginHistoryEntry[];
  total: number;
  has_suspicious: boolean;
  page: number;
  limit: number;
}

export interface LoginHistoryFilters {
  page?: number;
  limit?: number;
  start_date?: string;
  end_date?: string;
  device_type?: string;
  success_only?: boolean;
  period?: 'today' | 'week' | 'month' | 'all';
}

export interface MembershipResponse {
  id: string;
  owner_user_id: string;
  member_user_id: string;
  member_email: string;
  permission: MemberPermission;
  camera_ids: string[];
  created_at: string;
}

// Cameras service types
// Must match backend enums (CameraManagementBackend/domain/entities/camera.py)
export type CameraStatus = 'online' | 'offline' | 'disabled';
export type CameraType = 'indoor' | 'outdoor' | 'thermal' | 'fisheye' | 'ptz';

export interface CameraLocationRequest {
  building?: string;
  floor?: string;
  zone?: string;
  room?: string;
  gps_lat?: number;
  gps_long?: number;
}

export interface CreateCameraRequest {
  name: string;
  stream_url: string;
  protocol: string;
  resolution: string;
  fps: number;
  encoding: string;
  camera_type: CameraType;
  description?: string;
  username?: string;
  password?: string;
  location?: CameraLocationRequest;
}

export interface UpdateCameraRequest {
  name?: string;
  description?: string;
  stream_url?: string;
  resolution?: string;
  fps?: number;
  encoding?: string;
  location?: CameraLocationRequest;
}

export interface RecordHealthRequest {
  latency_ms?: number;
  frame_drop_rate?: number;
  uptime_percentage?: number;
}

export interface CameraLocationResponse {
  building?: string;
  floor?: string;
  zone?: string;
  room?: string;
  gps_lat?: number;
  gps_long?: number;
}

export interface CameraResponse {
  id: string;
  owner_user_id: string;
  name: string;
  description?: string;
  stream_url: string;
  protocol: string;
  resolution: string;
  fps: number;
  encoding: string;
  status: CameraStatus;
  camera_type: CameraType;
  is_active: boolean;
  location?: CameraLocationResponse;
  last_heartbeat?: string;
  created_at: string;
  updated_at: string;
}

export interface CameraHealthResponse {
  camera_id: string;
  last_heartbeat?: string;
  latency_ms?: number;
  frame_drop_rate?: number;
  uptime_percentage?: number;
  recorded_at: string;
}

// Streaming service types
export type StreamStatus = 'pending' | 'connecting' | 'active' | 'reconnecting' | 'stopped' | 'error';

// ── Zone types ──────────────────────────────────────────────────────
export type ZoneType = 'intrusion' | 'motion' | 'loitering' | 'line_cross' | 'crowd' | 'restricted' | 'counting';
export type ZoneSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface ZonePointRequest {
  x: number;
  y: number;
}

export interface CreateZoneRequest {
  camera_id: string;
  name: string;
  zone_type: ZoneType;
  severity: ZoneSeverity;
  points: ZonePointRequest[];
  color: string;
  description?: string;
  sensitivity: number;
  min_trigger_duration: number;
  alert_cooldown: number;
  schedule_enabled?: boolean;
  schedule_start?: string;
  schedule_end?: string;
  schedule_days?: string;
}

export interface UpdateZoneRequest {
  name?: string;
  zone_type?: ZoneType;
  severity?: ZoneSeverity;
  points?: ZonePointRequest[];
  color?: string;
  description?: string;
  is_active?: boolean;
  sensitivity?: number;
  min_trigger_duration?: number;
  alert_cooldown?: number;
  schedule_enabled?: boolean;
  schedule_start?: string;
  schedule_end?: string;
  schedule_days?: string;
}

export interface ZonePointResponse {
  x: number;
  y: number;
}

export interface ZoneResponse {
  id: string;
  camera_id: string;
  owner_user_id: string;
  name: string;
  zone_type: ZoneType;
  severity: ZoneSeverity;
  points: ZonePointResponse[];
  color: string;
  is_active: boolean;
  description?: string;
  sensitivity: number;
  min_trigger_duration: number;
  alert_cooldown: number;
  schedule_enabled: boolean;
  schedule_start?: string;
  schedule_end?: string;
  schedule_days?: string;
  created_at: string;
  updated_at: string;
}

export interface ZoneStatsResponse {
  total_zones: number;
  active_zones: number;
  zones_by_type: Record<string, number>;
  zones_by_severity: Record<string, number>;
  cameras_with_zones: number;
}

export interface StreamConfigRequest {
  fps?: number;
  quality?: number;
  width?: number;
  height?: number;
}

export interface StartStreamRequest {
  camera_id: string;
  stream_url: string;
  config?: StreamConfigRequest;
}

export interface StopStreamRequest {
  camera_id: string;
}

export interface StreamSessionResponse {
  id: string;
  camera_id: string;
  status: StreamStatus;
  fps: number;
  started_at?: string;
  last_frame_at?: string;
  stopped_at?: string;
  error_message?: string;
  reconnect_attempts: number;
  created_at: string;
  updated_at: string;
}

export interface StreamStatusResponse {
  camera_id: string;
  is_streaming: boolean;
  status: string;
  session?: StreamSessionResponse;
  signaling_url?: string;
  whep_endpoint?: string;
}

// WebRTC signaling types
export interface WebRTCOfferRequest {
  camera_id: string;
  sdp: string;
  type: string;
}

export interface WebRTCAnswerResponse {
  viewer_id: string;
  sdp: string;
  type: string;
}

export interface ICECandidateRequest {
  camera_id: string;
  viewer_id: string;
  candidate: string;
  sdp_mid?: string;
  sdp_mline_index?: number;
}

export interface ICEServerConfig {
  urls: string;
  username?: string;
  credential?: string;
}

export interface ICEServersResponse {
  ice_servers: ICEServerConfig[];
}

export interface RealTimeInfoResponse {
  camera_id: string;
  is_streaming: boolean;
  current_fps: number;
  viewer_count: number;
  has_audio: boolean;
  status: string;
  uptime: number;
  bitrate: number;
}

export interface ActiveStreamsResponse {
  count: number;
  streams: StreamSessionResponse[];
}

// Helper function to handle API responses
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error: ApiError = errorData.detail || { 
      message: 'An error occurred', 
      error_code: 'UNKNOWN_ERROR' 
    };
    throw error;
  }
  return response.json();
}

function authHeaders(): Record<string, string> {
  const token = tokenStorage.getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ── Auto-refresh fetch wrapper ──────────────────────────────────────
// Intercepts 401 responses, refreshes the JWT, and retries ONCE.
let _refreshPromise: Promise<boolean> | null = null;

async function tryRefreshToken(): Promise<boolean> {
  const refreshToken = tokenStorage.getRefreshToken();
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) return false;
    const data: TokenResponse = await res.json();
    tokenStorage.setTokens(data.access_token, data.refresh_token);
    return true;
  } catch {
    return false;
  }
}

/**
 * Wrapper around fetch that automatically retries with a fresh token on 401.
 * De-duplicates concurrent refresh attempts so only one refresh call runs.
 */
async function authFetch(input: RequestInfo, init?: RequestInit): Promise<Response> {
  // First attempt
  const response = await fetch(input, init);

  if (response.status !== 401) return response;

  // Token might be expired — try to refresh (de-duplicate)
  if (!_refreshPromise) {
    _refreshPromise = tryRefreshToken().finally(() => { _refreshPromise = null; });
  }
  const refreshed = await _refreshPromise;
  if (!refreshed) {
    // Refresh failed — clear everything and redirect to login
    tokenStorage.clearTokens();
    localStorage.removeItem('vigileye-user');
    window.location.href = '/login';
    return response;          // Return original 401 so caller can handle
  }

  // Retry original request with the new token
  const newHeaders = new Headers(init?.headers);
  newHeaders.set('Authorization', `Bearer ${tokenStorage.getAccessToken()}`);
  return fetch(input, { ...init, headers: newHeaders });
}

// API Functions
export const authApi = {
  /**
   * Register a new user
   * Sends verification OTP to email
   */
  register: async (data: RegisterRequest): Promise<MessageResponse> => {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return handleResponse<MessageResponse>(response);
  },

  /**
   * Verify email with OTP code
   */
  verifyEmail: async (data: VerifyOTPRequest): Promise<MessageResponse> => {
    const response = await fetch(`${API_BASE_URL}/auth/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return handleResponse<MessageResponse>(response);
  },

  /**
   * Login step 1: Validate credentials
   * Sends 2FA OTP to email if valid
   */
  login: async (data: LoginRequest): Promise<MessageResponse> => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return handleResponse<MessageResponse>(response);
  },

  /**
   * Login step 2: Confirm with 2FA OTP
   * Returns JWT tokens on success
   */
  confirmLogin: async (data: VerifyOTPRequest): Promise<AuthResponse> => {
    const response = await fetch(`${API_BASE_URL}/auth/login/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return handleResponse<AuthResponse>(response);
  },

  /**
   * Request password reset
   * Sends OTP to email
   */
  forgotPassword: async (data: ForgotPasswordRequest): Promise<MessageResponse> => {
    const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return handleResponse<MessageResponse>(response);
  },

  /**
   * Reset password with OTP
   */
  resetPassword: async (data: ResetPasswordRequest): Promise<MessageResponse> => {
    const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return handleResponse<MessageResponse>(response);
  },

  /**
   * Refresh JWT tokens
   */
  refreshTokens: async (data: RefreshTokenRequest): Promise<TokenResponse> => {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return handleResponse<TokenResponse>(response);
  },

  /**
   * Get Google OAuth authorization URL
   */
  getGoogleAuthUrl: async (): Promise<GoogleAuthURLResponse> => {
    const response = await fetch(`${API_BASE_URL}/auth/google`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return handleResponse<GoogleAuthURLResponse>(response);
  },
};

export const membersApi = {
  createInvitation: async (data: CreateMemberInvitationRequest): Promise<MemberInvitationResponse> => {
    const response = await authFetch(`${MEMBERS_API_BASE_URL}/members/invitations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      },
      body: JSON.stringify(data),
    });
    return handleResponse<MemberInvitationResponse>(response);
  },

  listReceivedInvitations: async (): Promise<MemberInvitationResponse[]> => {
    const response = await authFetch(`${MEMBERS_API_BASE_URL}/members/invitations/received`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      },
    });
    return handleResponse<MemberInvitationResponse[]>(response);
  },

  listSentInvitations: async (): Promise<MemberInvitationResponse[]> => {
    const response = await authFetch(`${MEMBERS_API_BASE_URL}/members/invitations/sent`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      },
    });
    return handleResponse<MemberInvitationResponse[]>(response);
  },

  acceptInvitation: async (invitationId: string, data: AcceptMemberInvitationRequest): Promise<MembershipResponse> => {
    const response = await authFetch(`${MEMBERS_API_BASE_URL}/members/invitations/${invitationId}/accept`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      },
      body: JSON.stringify(data),
    });
    return handleResponse<MembershipResponse>(response);
  },

  declineInvitation: async (invitationId: string, reason?: string): Promise<MessageResponse> => {
    const response = await authFetch(`${MEMBERS_API_BASE_URL}/members/invitations/${invitationId}/decline`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      },
      body: JSON.stringify({ reason: reason || null }),
    });
    return handleResponse<MessageResponse>(response);
  },

  resendCode: async (invitationId: string): Promise<MessageResponse> => {
    const response = await authFetch(`${MEMBERS_API_BASE_URL}/members/invitations/${invitationId}/resend-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      },
    });
    return handleResponse<MessageResponse>(response);
  },

  /**
   * List all active memberships where the current user is a member (shared cameras)
   */
  listMyMemberships: async (): Promise<MembershipResponse[]> => {
    const response = await authFetch(`${MEMBERS_API_BASE_URL}/members/memberships/mine`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      },
    });
    return handleResponse<MembershipResponse[]>(response);
  },
};

// Groups API
export const groupsApi = {
  createGroup: async (data: CreateGroupRequest): Promise<GroupResponse> => {
    const response = await authFetch(`${MEMBERS_API_BASE_URL}/members/groups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(data),
    });
    return handleResponse<GroupResponse>(response);
  },

  listGroups: async (): Promise<GroupResponse[]> => {
    const response = await authFetch(`${MEMBERS_API_BASE_URL}/members/groups`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
    });
    return handleResponse<GroupResponse[]>(response);
  },

  getGroup: async (groupId: string): Promise<GroupDetailResponse> => {
    const response = await authFetch(`${MEMBERS_API_BASE_URL}/members/groups/${groupId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
    });
    return handleResponse<GroupDetailResponse>(response);
  },

  updateGroup: async (groupId: string, data: UpdateGroupRequest): Promise<GroupResponse> => {
    const response = await authFetch(`${MEMBERS_API_BASE_URL}/members/groups/${groupId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(data),
    });
    return handleResponse<GroupResponse>(response);
  },

  deleteGroup: async (groupId: string): Promise<MessageResponse> => {
    const response = await authFetch(`${MEMBERS_API_BASE_URL}/members/groups/${groupId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
    });
    return handleResponse<MessageResponse>(response);
  },

  inviteMember: async (groupId: string, data: InviteGroupMemberRequest): Promise<GroupMemberResponse> => {
    const response = await authFetch(`${MEMBERS_API_BASE_URL}/members/groups/${groupId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(data),
    });
    return handleResponse<GroupMemberResponse>(response);
  },

  bulkInviteMembers: async (groupId: string, data: BulkInviteGroupMembersRequest): Promise<BulkInviteResultResponse> => {
    const response = await authFetch(`${MEMBERS_API_BASE_URL}/members/groups/${groupId}/members/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(data),
    });
    return handleResponse<BulkInviteResultResponse>(response);
  },

  updateMember: async (groupId: string, memberId: string, data: { access?: MemberPermission }): Promise<GroupMemberResponse> => {
    const response = await authFetch(`${MEMBERS_API_BASE_URL}/members/groups/${groupId}/members/${memberId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(data),
    });
    return handleResponse<GroupMemberResponse>(response);
  },

  removeMember: async (groupId: string, memberId: string): Promise<MessageResponse> => {
    const response = await authFetch(`${MEMBERS_API_BASE_URL}/members/groups/${groupId}/members/${memberId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
    });
    return handleResponse<MessageResponse>(response);
  },

  resendMemberCode: async (groupId: string, memberId: string): Promise<MessageResponse> => {
    const response = await authFetch(`${MEMBERS_API_BASE_URL}/members/groups/${groupId}/members/${memberId}/resend-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
    });
    return handleResponse<MessageResponse>(response);
  },

  resendAllCodes: async (groupId: string): Promise<MessageResponse> => {
    const response = await authFetch(`${MEMBERS_API_BASE_URL}/members/groups/${groupId}/resend-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
    });
    return handleResponse<MessageResponse>(response);
  },

  acceptInvitation: async (groupId: string, memberId: string, data: AcceptGroupInvitationRequest): Promise<MembershipResponse> => {
    const response = await authFetch(`${MEMBERS_API_BASE_URL}/members/groups/${groupId}/members/${memberId}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(data),
    });
    return handleResponse<MembershipResponse>(response);
  },

  declineInvitation: async (groupId: string, memberId: string): Promise<MessageResponse> => {
    const response = await authFetch(`${MEMBERS_API_BASE_URL}/members/groups/${groupId}/members/${memberId}/decline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
    });
    return handleResponse<MessageResponse>(response);
  },

  listReceivedInvitations: async (): Promise<ReceivedGroupInvitation[]> => {
    const response = await authFetch(`${MEMBERS_API_BASE_URL}/members/groups/invitations/received`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
    });
    return handleResponse<ReceivedGroupInvitation[]>(response);
  },
};

export const camerasApi = {
  /**
   * Create a new camera
   */
  createCamera: async (data: CreateCameraRequest): Promise<CameraResponse> => {
    const response = await authFetch(`${CAMERAS_API_BASE_URL}/cameras`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      },
      body: JSON.stringify(data),
    });
    return handleResponse<CameraResponse>(response);
  },

  /**
   * List all cameras for the current user
   */
  listCameras: async (): Promise<CameraResponse[]> => {
    const response = await authFetch(`${CAMERAS_API_BASE_URL}/cameras`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      },
    });
    return handleResponse<CameraResponse[]>(response);
  },

  /**
   * Get multiple cameras by IDs (for shared cameras)
   */
  getCamerasBatch: async (ids: string[]): Promise<CameraResponse[]> => {
    if (ids.length === 0) return [];
    const response = await authFetch(`${CAMERAS_API_BASE_URL}/cameras/batch?ids=${ids.join(',')}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      },
    });
    return handleResponse<CameraResponse[]>(response);
  },

  /**
   * Get a camera by ID
   */
  getCamera: async (cameraId: string): Promise<CameraResponse> => {
    const response = await authFetch(`${CAMERAS_API_BASE_URL}/cameras/${cameraId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      },
    });
    return handleResponse<CameraResponse>(response);
  },

  /**
   * Update a camera
   */
  updateCamera: async (cameraId: string, data: UpdateCameraRequest): Promise<CameraResponse> => {
    const response = await authFetch(`${CAMERAS_API_BASE_URL}/cameras/${cameraId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      },
      body: JSON.stringify(data),
    });
    return handleResponse<CameraResponse>(response);
  },

  /**
   * Delete a camera
   */
  deleteCamera: async (cameraId: string): Promise<MessageResponse> => {
    const response = await authFetch(`${CAMERAS_API_BASE_URL}/cameras/${cameraId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      },
    });
    return handleResponse<MessageResponse>(response);
  },

  /**
   * Enable a camera
   */
  enableCamera: async (cameraId: string): Promise<CameraResponse> => {
    const response = await authFetch(`${CAMERAS_API_BASE_URL}/cameras/${cameraId}/enable`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      },
    });
    return handleResponse<CameraResponse>(response);
  },

  /**
   * Disable a camera
   */
  disableCamera: async (cameraId: string): Promise<CameraResponse> => {
    const response = await authFetch(`${CAMERAS_API_BASE_URL}/cameras/${cameraId}/disable`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      },
    });
    return handleResponse<CameraResponse>(response);
  },

  /**
   * Get camera health metrics
   */
  getCameraHealth: async (cameraId: string): Promise<CameraHealthResponse> => {
    const response = await authFetch(`${CAMERAS_API_BASE_URL}/cameras/${cameraId}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      },
    });
    return handleResponse<CameraHealthResponse>(response);
  },

  /**
   * Record camera heartbeat
   */
  recordHeartbeat: async (cameraId: string, data: RecordHealthRequest): Promise<CameraHealthResponse> => {
    const response = await authFetch(`${CAMERAS_API_BASE_URL}/cameras/${cameraId}/heartbeat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      },
      body: JSON.stringify(data),
    });
    return handleResponse<CameraHealthResponse>(response);
  },
};

// ── Zones API ───────────────────────────────────────────────────────
export const zonesApi = {
  /** Create a detection zone */
  createZone: async (data: CreateZoneRequest): Promise<ZoneResponse> => {
    const response = await authFetch(`${CAMERAS_API_BASE_URL}/zones`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(data),
    });
    return handleResponse<ZoneResponse>(response);
  },

  /** List all zones for the current user */
  listZones: async (): Promise<ZoneResponse[]> => {
    const response = await authFetch(`${CAMERAS_API_BASE_URL}/zones`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
    });
    return handleResponse<ZoneResponse[]>(response);
  },

  /** Get zone stats */
  getStats: async (): Promise<ZoneStatsResponse> => {
    const response = await authFetch(`${CAMERAS_API_BASE_URL}/zones/stats`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
    });
    return handleResponse<ZoneStatsResponse>(response);
  },

  /** List zones for a specific camera */
  listCameraZones: async (cameraId: string): Promise<ZoneResponse[]> => {
    const response = await authFetch(`${CAMERAS_API_BASE_URL}/zones/camera/${cameraId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
    });
    return handleResponse<ZoneResponse[]>(response);
  },

  /** Get a single zone */
  getZone: async (zoneId: string): Promise<ZoneResponse> => {
    const response = await authFetch(`${CAMERAS_API_BASE_URL}/zones/${zoneId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
    });
    return handleResponse<ZoneResponse>(response);
  },

  /** Update a zone */
  updateZone: async (zoneId: string, data: UpdateZoneRequest): Promise<ZoneResponse> => {
    const response = await authFetch(`${CAMERAS_API_BASE_URL}/zones/${zoneId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(data),
    });
    return handleResponse<ZoneResponse>(response);
  },

  /** Activate a zone */
  activateZone: async (zoneId: string): Promise<ZoneResponse> => {
    const response = await authFetch(`${CAMERAS_API_BASE_URL}/zones/${zoneId}/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
    });
    return handleResponse<ZoneResponse>(response);
  },

  /** Deactivate a zone */
  deactivateZone: async (zoneId: string): Promise<ZoneResponse> => {
    const response = await authFetch(`${CAMERAS_API_BASE_URL}/zones/${zoneId}/deactivate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
    });
    return handleResponse<ZoneResponse>(response);
  },

  /** Delete a zone */
  deleteZone: async (zoneId: string): Promise<MessageResponse> => {
    const response = await authFetch(`${CAMERAS_API_BASE_URL}/zones/${zoneId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
    });
    return handleResponse<MessageResponse>(response);
  },
};

// Video Streaming API
export const streamingApi = {
  /**
   * Start streaming from a camera
   */
  startStream: async (data: StartStreamRequest): Promise<StreamSessionResponse> => {
    const response = await authFetch(`${STREAMING_API_BASE_URL}/api/v1/streams/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      },
      body: JSON.stringify(data),
    });
    return handleResponse<StreamSessionResponse>(response);
  },

  /**
   * Stop streaming from a camera
   */
  stopStream: async (cameraId: string): Promise<StreamSessionResponse> => {
    const response = await authFetch(`${STREAMING_API_BASE_URL}/api/v1/streams/stop`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      },
      body: JSON.stringify({ camera_id: cameraId }),
    });
    return handleResponse<StreamSessionResponse>(response);
  },

  /**
   * Get stream status for a camera
   */
  getStreamStatus: async (cameraId: string): Promise<StreamStatusResponse> => {
    const response = await authFetch(`${STREAMING_API_BASE_URL}/api/v1/streams/status/${cameraId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      },
    });
    return handleResponse<StreamStatusResponse>(response);
  },

  /**
   * List all active streams
   */
  listActiveStreams: async (): Promise<ActiveStreamsResponse> => {
    const response = await authFetch(`${STREAMING_API_BASE_URL}/api/v1/streams/active`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      },
    });
    return handleResponse<ActiveStreamsResponse>(response);
  },

  /**
   * Send WebRTC SDP offer and get SDP answer
   */
  webrtcOffer: async (data: WebRTCOfferRequest): Promise<WebRTCAnswerResponse> => {
    const response = await authFetch(`${STREAMING_API_BASE_URL}/api/v1/webrtc/offer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      },
      body: JSON.stringify(data),
    });
    return handleResponse<WebRTCAnswerResponse>(response);
  },

  /**
   * Send ICE candidate for trickle ICE
   */
  sendICECandidate: async (data: ICECandidateRequest): Promise<void> => {
    await authFetch(`${STREAMING_API_BASE_URL}/api/v1/webrtc/ice-candidate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      },
      body: JSON.stringify(data),
    });
  },

  /**
   * Disconnect a WebRTC viewer session
   */
  webrtcDisconnect: async (cameraId: string, viewerId: string): Promise<void> => {
    await authFetch(`${STREAMING_API_BASE_URL}/api/v1/webrtc/disconnect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      },
      body: JSON.stringify({ camera_id: cameraId, viewer_id: viewerId }),
    });
  },

  /**
   * Get ICE server configuration for WebRTC
   */
  getICEServers: async (): Promise<ICEServersResponse> => {
    const response = await authFetch(`${STREAMING_API_BASE_URL}/api/v1/streams/ice-servers`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      },
    });
    return handleResponse<ICEServersResponse>(response);
  },

  /**
   * Get real-time streaming info for a camera
   */
  getRealTimeInfo: async (cameraId: string): Promise<RealTimeInfoResponse> => {
    const response = await authFetch(`${STREAMING_API_BASE_URL}/api/v1/streams/realtime/${cameraId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      },
    });
    return handleResponse<RealTimeInfoResponse>(response);
  },

  /**
   * Get latest JPEG frame for HTTP polling fallback (thumbnails)
   */
  getFrameUrl: (cameraId: string): string => {
    return `${STREAMING_API_BASE_URL}/api/v1/streams/frame/${cameraId}`;
  },
};

// Login History API
export const loginHistoryApi = {
  /**
   * Get login history for current user
   */
  getLoginHistory: async (filters?: LoginHistoryFilters): Promise<LoginHistoryListResponse> => {
    const params = new URLSearchParams();
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.start_date) params.append('start_date', filters.start_date);
    if (filters?.end_date) params.append('end_date', filters.end_date);
    if (filters?.device_type) params.append('device_type', filters.device_type);
    if (filters?.success_only !== undefined) params.append('success_only', filters.success_only.toString());
    if (filters?.period) params.append('period', filters.period);

    const queryString = params.toString();
    const url = `${API_BASE_URL}/login-history${queryString ? `?${queryString}` : ''}`;
    
    const response = await authFetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      },
    });
    return handleResponse<LoginHistoryListResponse>(response);
  },

  /**
   * Get suspicious login attempts
   */
  getSuspiciousLogins: async (limit: number = 10): Promise<LoginHistoryListResponse> => {
    const response = await authFetch(`${API_BASE_URL}/login-history/suspicious?limit=${limit}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      },
    });
    return handleResponse<LoginHistoryListResponse>(response);
  },
};

// Token storage utilities
export const tokenStorage = {
  getAccessToken: (): string | null => {
    return localStorage.getItem('vigileye-access-token');
  },

  getRefreshToken: (): string | null => {
    return localStorage.getItem('vigileye-refresh-token');
  },

  setTokens: (accessToken: string, refreshToken: string): void => {
    localStorage.setItem('vigileye-access-token', accessToken);
    localStorage.setItem('vigileye-refresh-token', refreshToken);
  },

  clearTokens: (): void => {
    localStorage.removeItem('vigileye-access-token');
    localStorage.removeItem('vigileye-refresh-token');
  },
};

/**
 * Auto-detect streaming protocol from a URL.
 */
export function detectProtocol(url: string): string {
  const lower = url.toLowerCase().trim();
  if (lower.startsWith('rtsp://')) return 'rtsp';
  if (lower.startsWith('rtmp://')) return 'rtmp';
  if (lower.startsWith('onvif://')) return 'onvif';
  if (lower.includes('.m3u8') || lower.includes('/hls/')) return 'hls';
  if (lower.startsWith('http://') || lower.startsWith('https://')) return 'http';
  return 'rtsp';
}

/**
 * Extends CameraResponse with permission info for shared cameras.
 */
export interface CameraWithPermission extends CameraResponse {
  /** reader | editor | owner */
  permission: 'reader' | 'editor' | 'owner';
  /** true if this camera is shared to the current user (not owned) */
  isShared: boolean;
}

export default authApi;
