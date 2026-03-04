package services

import "github.com/vigileye/streaming-backend/internal/domain/entities"

// AuthPayload represents the decoded JWT claims.
type AuthPayload struct {
	Sub   string `json:"sub"`
	Email string `json:"email"`
	Type  string `json:"type"`
}

// AuthService validates JWT tokens from the Auth service.
type AuthService interface {
	ValidateToken(token string) (*AuthPayload, error)
}

// CameraService fetches camera details from Camera Management.
type CameraService interface {
	GetCamera(cameraID, token string) (*entities.Camera, error)
	GetCamerasForUser(userID, token string) ([]*entities.Camera, error)
}

// RealTimeInfo holds streaming statistics.
type RealTimeInfo struct {
	CurrentFPS  int    `json:"current_fps"`
	ViewerCount int    `json:"viewer_count"`
	HasAudio    bool   `json:"has_audio"`
	Status      string `json:"status"`
	Uptime      int64  `json:"uptime"`
	Bitrate     int64  `json:"bitrate"`
}

// StreamService manages the streaming pipeline lifecycle.
type StreamService interface {
	// StartStream begins ingesting a camera and returns the session.
	StartStream(cameraID, ownerUserID, streamURL string, cfg *entities.StreamConfig) (*entities.StreamSession, error)
	// StopStream stops a camera stream.
	StopStream(cameraID string) (*entities.StreamSession, error)
	// StopAll stops all active streams.
	StopAll()
	// GetSession returns the session for a camera.
	GetSession(cameraID string) (*entities.StreamSession, bool)
	// GetAllSessions returns all active sessions.
	GetAllSessions() []*entities.StreamSession
	// IsStreaming checks if a camera is actively streaming.
	IsStreaming(cameraID string) bool
	// AddViewer increments the viewer count.
	AddViewer(cameraID string)
	// RemoveViewer decrements the viewer count.
	RemoveViewer(cameraID string)
	// GetRealTimeInfo returns streaming statistics.
	GetRealTimeInfo(cameraID string) *RealTimeInfo
	// GetICEServers returns ICE server configuration for WebRTC.
	GetICEServers() []ICEServer
	// GetLatestFrame returns the latest JPEG frame for HTTP polling.
	GetLatestFrame(cameraID string) []byte
}

// ICEServer represents WebRTC ICE server configuration.
type ICEServer struct {
	URLs       string `json:"urls"`
	Username   string `json:"username,omitempty"`
	Credential string `json:"credential,omitempty"`
}
