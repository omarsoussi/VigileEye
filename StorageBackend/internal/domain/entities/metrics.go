package entities

import "time"

// StorageMetrics holds storage usage info for a camera or user.
type StorageMetrics struct {
	CameraID       string    `json:"camera_id,omitempty"`
	OwnerUserID    string    `json:"owner_user_id"`
	TotalFiles     int       `json:"total_files"`
	TotalSizeBytes int64     `json:"total_size_bytes"`
	TotalSizeGB    float64   `json:"total_size_gb"`
	QuotaGB        float64   `json:"quota_gb"`
	UsagePercent   float64   `json:"usage_percent"`
	OldestFile     *time.Time `json:"oldest_file,omitempty"`
	NewestFile     *time.Time `json:"newest_file,omitempty"`
}

// DownloadToken represents a short-lived signed download URL token.
type DownloadToken struct {
	Token     string    `json:"token"`
	RecordID  string    `json:"record_id"`
	UserID    string    `json:"user_id"`
	ExpiresAt time.Time `json:"expires_at"`
}
