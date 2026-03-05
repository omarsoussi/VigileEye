package entities

import (
	"time"

	"github.com/google/uuid"
)

// StorageMode represents the storage backend type.
type StorageMode string

const (
	StorageModeLocal StorageMode = "local"
	StorageModeMinio StorageMode = "minio"
	StorageModeAzure StorageMode = "azure"
)

// SubscriptionTier represents the user's subscription level.
type SubscriptionTier string

const (
	SubscriptionFree SubscriptionTier = "FREE"
	SubscriptionPro  SubscriptionTier = "PRO"
)

// CameraStorageConfig holds per-camera storage settings.
type CameraStorageConfig struct {
	ID              string           `json:"id"`
	CameraID        string           `json:"camera_id"`
	OwnerUserID     string           `json:"owner_user_id"`
	Enabled         bool             `json:"enabled"`
	StorageMode     StorageMode      `json:"storage_mode"`
	RetentionDays   int              `json:"retention_days"`
	QuotaGB         float64          `json:"quota_gb"`
	Bitrate         int              `json:"bitrate"`
	Resolution      string           `json:"resolution"`
	SegmentMinutes  int              `json:"segment_minutes"`
	Subscription    SubscriptionTier `json:"subscription"`
	CreatedAt       time.Time        `json:"created_at"`
	UpdatedAt       time.Time        `json:"updated_at"`
}

// NewCameraStorageConfig creates a new config with defaults.
func NewCameraStorageConfig(cameraID, ownerUserID string) *CameraStorageConfig {
	now := time.Now().UTC()
	return &CameraStorageConfig{
		ID:             uuid.New().String(),
		CameraID:       cameraID,
		OwnerUserID:    ownerUserID,
		Enabled:        false,
		StorageMode:    StorageModeLocal,
		RetentionDays:  7,
		QuotaGB:        10.0,
		Bitrate:        2_000_000,
		Resolution:     "1280x720",
		SegmentMinutes: 0,
		Subscription:   SubscriptionFree,
		CreatedAt:      now,
		UpdatedAt:      now,
	}
}

// CanUseCloudStorage checks if user's subscription allows cloud storage.
func (c *CameraStorageConfig) CanUseCloudStorage() bool {
	return c.Subscription == SubscriptionPro
}

// Update modifies settings.
func (c *CameraStorageConfig) Update(mode StorageMode, retentionDays int, quotaGB float64, bitrate int, resolution string, segmentMin int) {
	c.StorageMode = mode
	c.RetentionDays = retentionDays
	c.QuotaGB = quotaGB
	c.Bitrate = bitrate
	c.Resolution = resolution
	c.SegmentMinutes = segmentMin
	c.UpdatedAt = time.Now().UTC()
}
