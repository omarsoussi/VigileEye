package entities

import (
	"time"

	"github.com/google/uuid"
)

// RecordingStatus represents the state of a recording segment.
type RecordingStatus string

const (
	RecordingStatusRecording  RecordingStatus = "recording"
	RecordingStatusCompleted  RecordingStatus = "completed"
	RecordingStatusUploading  RecordingStatus = "uploading"
	RecordingStatusFailed     RecordingStatus = "failed"
	RecordingStatusDeleted    RecordingStatus = "deleted"
)

// Recording represents a single video segment recorded from a camera.
type Recording struct {
	ID            string          `json:"id"`
	CameraID      string          `json:"camera_id"`
	OwnerUserID   string          `json:"owner_user_id"`
	FileName      string          `json:"file_name"`
	FilePath      string          `json:"file_path"`
	FileSize      int64           `json:"file_size"`
	DurationSecs  int             `json:"duration_secs"`
	Resolution    string          `json:"resolution"`
	Bitrate       int             `json:"bitrate"`
	Codec         string          `json:"codec"`
	Format        string          `json:"format"`
	ThumbnailPath string          `json:"thumbnail_path"`
	StorageMode   string          `json:"storage_mode"`
	Status        RecordingStatus `json:"status"`
	StartedAt     time.Time       `json:"started_at"`
	EndedAt       *time.Time      `json:"ended_at"`
	CreatedAt     time.Time       `json:"created_at"`
	UpdatedAt     time.Time       `json:"updated_at"`
}

// NewRecording creates a new Recording entity.
func NewRecording(cameraID, ownerUserID, storageMode string) *Recording {
	now := time.Now().UTC()
	return &Recording{
		ID:          uuid.New().String(),
		CameraID:    cameraID,
		OwnerUserID: ownerUserID,
		StorageMode: storageMode,
		Status:      RecordingStatusRecording,
		Format:      "mp4",
		Codec:       "h264",
		StartedAt:   now,
		CreatedAt:   now,
		UpdatedAt:   now,
	}
}

// Complete marks the recording as completed.
func (r *Recording) Complete(fileSize int64, durationSecs int) {
	now := time.Now().UTC()
	r.Status = RecordingStatusCompleted
	r.FileSize = fileSize
	r.DurationSecs = durationSecs
	r.EndedAt = &now
	r.UpdatedAt = now
}

// MarkFailed marks the recording as failed.
func (r *Recording) MarkFailed() {
	now := time.Now().UTC()
	r.Status = RecordingStatusFailed
	r.UpdatedAt = now
}

// MarkDeleted marks the recording as deleted.
func (r *Recording) MarkDeleted() {
	now := time.Now().UTC()
	r.Status = RecordingStatusDeleted
	r.UpdatedAt = now
}

// IsActive checks if the recording is still in progress.
func (r *Recording) IsActive() bool {
	return r.Status == RecordingStatusRecording
}
