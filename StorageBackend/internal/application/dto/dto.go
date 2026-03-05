package dto

import "time"

// ─── Requests ───

// StartRecordingRequest is the request body for starting a recording.
type StartRecordingRequest struct {
	CameraID  string `json:"camera_id" binding:"required"`
	StreamURL string `json:"stream_url,omitempty"`
}

// StopRecordingRequest is the request body for stopping a recording.
type StopRecordingRequest struct {
	CameraID string `json:"camera_id" binding:"required"`
}

// UpdateStorageConfigRequest is the request body for updating storage settings.
type UpdateStorageConfigRequest struct {
	CameraID       string  `json:"camera_id" binding:"required"`
	Enabled        *bool   `json:"enabled,omitempty"`
	StorageMode    string  `json:"storage_mode,omitempty"`
	RetentionDays  *int    `json:"retention_days,omitempty"`
	QuotaGB        *float64 `json:"quota_gb,omitempty"`
	Bitrate        *int    `json:"bitrate,omitempty"`
	Resolution     string  `json:"resolution,omitempty"`
	SegmentMinutes *int    `json:"segment_minutes,omitempty"`
}

// UpdateSubscriptionRequest simulates subscription change.
type UpdateSubscriptionRequest struct {
	Tier string `json:"tier" binding:"required"` // FREE or PRO
}

// ─── Responses ───

// RecordingResponse is the API response for a recording.
type RecordingResponse struct {
	ID            string     `json:"id"`
	CameraID      string     `json:"camera_id"`
	OwnerUserID   string     `json:"owner_user_id"`
	FileName      string     `json:"file_name"`
	FilePath      string     `json:"file_path"`
	FileSize      int64      `json:"file_size"`
	DurationSecs  int        `json:"duration_secs"`
	Resolution    string     `json:"resolution"`
	Bitrate       int        `json:"bitrate"`
	Format        string     `json:"format"`
	ThumbnailPath string     `json:"thumbnail_path,omitempty"`
	StorageMode   string     `json:"storage_mode"`
	Status        string     `json:"status"`
	StartedAt     string     `json:"started_at"`
	EndedAt       *string    `json:"ended_at,omitempty"`
	CreatedAt     string     `json:"created_at"`
}

// StorageConfigResponse is the API response for storage configuration.
type StorageConfigResponse struct {
	ID             string  `json:"id"`
	CameraID       string  `json:"camera_id"`
	Enabled        bool    `json:"enabled"`
	StorageMode    string  `json:"storage_mode"`
	RetentionDays  int     `json:"retention_days"`
	QuotaGB        float64 `json:"quota_gb"`
	Bitrate        int     `json:"bitrate"`
	Resolution     string  `json:"resolution"`
	SegmentMinutes int     `json:"segment_minutes"`
	Subscription   string  `json:"subscription"`
	CreatedAt      string  `json:"created_at"`
	UpdatedAt      string  `json:"updated_at"`
}

// StorageMetricsResponse is the API response for storage metrics.
type StorageMetricsResponse struct {
	CameraID       string   `json:"camera_id,omitempty"`
	OwnerUserID    string   `json:"owner_user_id"`
	TotalFiles     int      `json:"total_files"`
	TotalSizeBytes int64    `json:"total_size_bytes"`
	TotalSizeGB    float64  `json:"total_size_gb"`
	QuotaGB        float64  `json:"quota_gb"`
	UsagePercent   float64  `json:"usage_percent"`
	OldestFile     *string  `json:"oldest_file,omitempty"`
	NewestFile     *string  `json:"newest_file,omitempty"`
}

// ActiveRecordingsResponse lists all active recordings.
type ActiveRecordingsResponse struct {
	Recordings []RecordingResponse `json:"recordings"`
	Count      int                 `json:"count"`
}

// DownloadTokenResponse contains a short-lived download URL.
type DownloadTokenResponse struct {
	URL       string `json:"url"`
	ExpiresAt string `json:"expires_at"`
}

// ErrorResponse is the standard error response.
type ErrorResponse struct {
	Detail ErrorDetail `json:"detail"`
}

// ErrorDetail contains error details.
type ErrorDetail struct {
	Message   string `json:"message"`
	ErrorCode string `json:"error_code"`
}

// Helper functions for time formatting.
func FormatTime(t time.Time) string {
	if t.IsZero() {
		return ""
	}
	return t.Format(time.RFC3339)
}

func FormatTimePtr(t *time.Time) *string {
	if t == nil {
		return nil
	}
	s := t.Format(time.RFC3339)
	return &s
}
