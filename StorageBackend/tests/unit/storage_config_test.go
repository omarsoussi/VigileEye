package unit

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/vigileye/storage-backend/internal/domain/entities"
)

func TestNewCameraStorageConfig(t *testing.T) {
	cfg := entities.NewCameraStorageConfig("cam-1", "user-1")

	assert.NotEmpty(t, cfg.ID)
	assert.Equal(t, "cam-1", cfg.CameraID)
	assert.Equal(t, "user-1", cfg.OwnerUserID)
	assert.False(t, cfg.Enabled)
	assert.Equal(t, entities.StorageModeLocal, cfg.StorageMode)
	assert.Equal(t, 7, cfg.RetentionDays)
	assert.Equal(t, 10.0, cfg.QuotaGB)
	assert.Equal(t, 2_000_000, cfg.Bitrate)
	assert.Equal(t, "1280x720", cfg.Resolution)
	assert.Equal(t, 10, cfg.SegmentMinutes)
	assert.Equal(t, entities.SubscriptionFree, cfg.Subscription)
}

func TestCameraStorageConfig_CanUseCloudStorage(t *testing.T) {
	cfg := entities.NewCameraStorageConfig("cam-1", "user-1")
	assert.False(t, cfg.CanUseCloudStorage())

	cfg.Subscription = entities.SubscriptionPro
	assert.True(t, cfg.CanUseCloudStorage())
}

func TestCameraStorageConfig_Update(t *testing.T) {
	cfg := entities.NewCameraStorageConfig("cam-1", "user-1")
	cfg.Update(entities.StorageModeMinio, 30, 50.0, 4_000_000, "1920x1080", 15)

	assert.Equal(t, entities.StorageModeMinio, cfg.StorageMode)
	assert.Equal(t, 30, cfg.RetentionDays)
	assert.Equal(t, 50.0, cfg.QuotaGB)
	assert.Equal(t, 4_000_000, cfg.Bitrate)
	assert.Equal(t, "1920x1080", cfg.Resolution)
	assert.Equal(t, 15, cfg.SegmentMinutes)
}

func TestStorageModes(t *testing.T) {
	assert.Equal(t, entities.StorageMode("local"), entities.StorageModeLocal)
	assert.Equal(t, entities.StorageMode("minio"), entities.StorageModeMinio)
	assert.Equal(t, entities.StorageMode("azure"), entities.StorageModeAzure)
}

func TestSubscriptionTiers(t *testing.T) {
	assert.Equal(t, entities.SubscriptionTier("FREE"), entities.SubscriptionFree)
	assert.Equal(t, entities.SubscriptionTier("PRO"), entities.SubscriptionPro)
}
