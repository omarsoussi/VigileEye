package services

import (
	"context"
	"io"

	"github.com/vigileye/storage-backend/internal/domain/entities"
)

// AuthPayload represents the decoded JWT claims.
type AuthPayload struct {
	Sub   string `json:"sub"`
	Email string `json:"email"`
	Type  string `json:"type"`
}

// DownloadTokenPayload represents the decoded claims from a download token.
type DownloadTokenPayload struct {
	RecordID string `json:"record_id"`
	UserID   string `json:"user_id"`
	Type     string `json:"type"`
}

// AuthService validates JWT tokens from the Auth service.
type AuthService interface {
	ValidateToken(token string) (*AuthPayload, error)
	ValidateDownloadToken(token string) (*DownloadTokenPayload, error)
	GenerateDownloadToken(recordID, userID string, durationSecs int) (string, error)
}

// CameraService fetches camera details from Camera Management.
type CameraService interface {
	GetCamera(cameraID, token string) (*entities.Camera, error)
	GetCamerasForUser(userID, token string) ([]*entities.Camera, error)
}

// StorageBackend is the strategy interface for pluggable storage backends.
type StorageBackend interface {
	// Upload stores a file and returns the storage path.
	Upload(ctx context.Context, key string, reader io.Reader, size int64, contentType string) (string, error)
	// Download returns a ReadCloser for the stored file.
	Download(ctx context.Context, key string) (io.ReadCloser, error)
	// Delete removes a file from storage.
	Delete(ctx context.Context, key string) error
	// GetSize returns the size of a stored file in bytes.
	GetSize(ctx context.Context, key string) (int64, error)
	// Exists checks if a file exists.
	Exists(ctx context.Context, key string) (bool, error)
	// GetSignedURL generates a time-limited download URL.
	GetSignedURL(ctx context.Context, key string, durationSecs int) (string, error)
	// StreamRange returns a reader for a byte range (for HTTP range requests / seeking).
	StreamRange(ctx context.Context, key string, start, end int64) (io.ReadCloser, error)
	// Mode returns the storage mode identifier.
	Mode() string
}

// RecordingService manages the recording pipeline.
type RecordingService interface {
	// StartRecording begins recording a camera stream.
	StartRecording(ctx context.Context, cameraID, ownerUserID, streamURL string, config *entities.CameraStorageConfig) (*entities.Recording, error)
	// StopRecording stops an active recording for a camera.
	StopRecording(ctx context.Context, cameraID string) (*entities.Recording, error)
	// StopAll stops all active recordings.
	StopAll()
	// IsRecording checks if a camera is currently being recorded.
	IsRecording(cameraID string) bool
	// GetActiveRecordings returns all active recording sessions.
	GetActiveRecordings() []*entities.Recording
}
