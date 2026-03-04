package entities

import (
	"time"
)

// StreamStatus represents the lifecycle state of a stream session.
type StreamStatus string

const (
	StreamStatusPending      StreamStatus = "pending"
	StreamStatusConnecting   StreamStatus = "connecting"
	StreamStatusActive       StreamStatus = "active"
	StreamStatusReconnecting StreamStatus = "reconnecting"
	StreamStatusStopped      StreamStatus = "stopped"
	StreamStatusError        StreamStatus = "error"
)

// StreamConfig holds encoding/resolution parameters for a stream.
type StreamConfig struct {
	FPS     int    `json:"fps"`
	Width   int    `json:"width"`
	Height  int    `json:"height"`
	Codec   string `json:"codec"`
	Bitrate int    `json:"bitrate"`
}

// DefaultStreamConfig provides sane defaults.
var DefaultStreamConfig = StreamConfig{
	FPS:     15,
	Width:   1280,
	Height:  720,
	Codec:   "h264",
	Bitrate: 2_000_000,
}

// StreamSession represents an active camera ingest session.
// One session per camera; multiple viewers consume from it via WebRTC.
type StreamSession struct {
	ID          string       `json:"id"`
	CameraID    string       `json:"camera_id"`
	OwnerUserID string       `json:"owner_user_id"`
	StreamURL   string       `json:"stream_url"`
	Status      StreamStatus `json:"status"`
	Config      StreamConfig `json:"config"`
	ViewerCount int          `json:"viewer_count"`

	// Timestamps
	StartedAt   *time.Time `json:"started_at"`
	LastFrameAt *time.Time `json:"last_frame_at"`
	StoppedAt   *time.Time `json:"stopped_at"`

	// Error tracking
	ErrorMessage     string `json:"error_message"`
	ReconnectAttempts int   `json:"reconnect_attempts"`

	// Metadata
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// NewStreamSession creates a new stream session in "pending" state.
func NewStreamSession(id, cameraID, ownerUserID, streamURL string, cfg StreamConfig) *StreamSession {
	now := time.Now().UTC()
	return &StreamSession{
		ID:          id,
		CameraID:    cameraID,
		OwnerUserID: ownerUserID,
		StreamURL:   streamURL,
		Status:      StreamStatusPending,
		Config:      cfg,
		ViewerCount: 0,
		CreatedAt:   now,
		UpdatedAt:   now,
	}
}

// Activate marks the session as actively streaming.
func (s *StreamSession) Activate() {
	now := time.Now().UTC()
	s.Status = StreamStatusActive
	s.StartedAt = &now
	s.UpdatedAt = now
}

// Stop marks the session as stopped.
func (s *StreamSession) Stop() {
	now := time.Now().UTC()
	s.Status = StreamStatusStopped
	s.StoppedAt = &now
	s.UpdatedAt = now
}

// SetError marks the session as errored.
func (s *StreamSession) SetError(msg string) {
	s.Status = StreamStatusError
	s.ErrorMessage = msg
	s.UpdatedAt = time.Now().UTC()
}

// IncrementViewers atomically adds a viewer.
func (s *StreamSession) IncrementViewers() {
	s.ViewerCount++
	s.UpdatedAt = time.Now().UTC()
}

// DecrementViewers atomically removes a viewer.
func (s *StreamSession) DecrementViewers() {
	if s.ViewerCount > 0 {
		s.ViewerCount--
	}
	s.UpdatedAt = time.Now().UTC()
}

// IsActive returns true if the stream is currently active.
func (s *StreamSession) IsActive() bool {
	return s.Status == StreamStatusActive || s.Status == StreamStatusConnecting || s.Status == StreamStatusReconnecting
}
