package entities

import "time"

// ViewerState represents a WebRTC viewer's connection state.
type ViewerState string

const (
	ViewerStateConnecting   ViewerState = "connecting"
	ViewerStateConnected    ViewerState = "connected"
	ViewerStatePaused       ViewerState = "paused"
	ViewerStateDisconnected ViewerState = "disconnected"
)

// ViewerSession tracks a single WebRTC peer connection for a viewer.
type ViewerSession struct {
	ID           string      `json:"id"`
	CameraID     string      `json:"camera_id"`
	UserID       string      `json:"user_id"`
	State        ViewerState `json:"state"`
	ConnectedAt  time.Time   `json:"connected_at"`
	LastActiveAt time.Time   `json:"last_active_at"`
	UserAgent    string      `json:"user_agent"`
}

// NewViewerSession creates a new viewer session.
func NewViewerSession(id, cameraID, userID, userAgent string) *ViewerSession {
	now := time.Now().UTC()
	return &ViewerSession{
		ID:           id,
		CameraID:     cameraID,
		UserID:       userID,
		State:        ViewerStateConnecting,
		ConnectedAt:  now,
		LastActiveAt: now,
		UserAgent:    userAgent,
	}
}
