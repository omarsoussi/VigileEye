package usecases

import (
	"context"
	"fmt"

	"github.com/vigileye/storage-backend/internal/domain/entities"
	"github.com/vigileye/storage-backend/internal/domain/repositories"
)

// ManageStorageConfigUseCase handles CRUD for per-camera storage configs.
type ManageStorageConfigUseCase struct {
	configRepo repositories.StorageConfigRepository
}

// NewManageStorageConfigUseCase creates a new use case.
func NewManageStorageConfigUseCase(cr repositories.StorageConfigRepository) *ManageStorageConfigUseCase {
	return &ManageStorageConfigUseCase{configRepo: cr}
}

// GetOrCreate retrieves or creates a storage config for a camera.
func (uc *ManageStorageConfigUseCase) GetOrCreate(ctx context.Context, cameraID, ownerUserID string) (*entities.CameraStorageConfig, error) {
	cfg, _ := uc.configRepo.GetByCamera(ctx, cameraID)
	if cfg != nil {
		return cfg, nil
	}

	cfg = entities.NewCameraStorageConfig(cameraID, ownerUserID)
	if err := uc.configRepo.Create(ctx, cfg); err != nil {
		return nil, fmt.Errorf("failed to create config: %w", err)
	}
	return cfg, nil
}

// Update modifies a camera's storage config.
func (uc *ManageStorageConfigUseCase) Update(ctx context.Context, cameraID, ownerUserID string, updates map[string]interface{}) (*entities.CameraStorageConfig, error) {
	cfg, _ := uc.configRepo.GetByCamera(ctx, cameraID)
	if cfg == nil {
		cfg = entities.NewCameraStorageConfig(cameraID, ownerUserID)
	}

	if enabled, ok := updates["enabled"].(bool); ok {
		cfg.Enabled = enabled
	}
	if mode, ok := updates["storage_mode"].(string); ok {
		newMode := entities.StorageMode(mode)
		if newMode == entities.StorageModeAzure || newMode == entities.StorageModeMinio {
			if !cfg.CanUseCloudStorage() {
				return nil, fmt.Errorf("PRO subscription required for %s storage", mode)
			}
		}
		cfg.StorageMode = newMode
	}
	if days, ok := updates["retention_days"].(int); ok {
		cfg.RetentionDays = days
	}
	if quota, ok := updates["quota_gb"].(float64); ok {
		cfg.QuotaGB = quota
	}
	if bitrate, ok := updates["bitrate"].(int); ok {
		cfg.Bitrate = bitrate
	}
	if resolution, ok := updates["resolution"].(string); ok {
		cfg.Resolution = resolution
	}
	if seg, ok := updates["segment_minutes"].(int); ok {
		cfg.SegmentMinutes = seg
	}

	if err := uc.configRepo.Update(ctx, cfg); err != nil {
		return nil, fmt.Errorf("failed to update config: %w", err)
	}
	return cfg, nil
}

// ListByUser returns all storage configs for a user.
func (uc *ManageStorageConfigUseCase) ListByUser(ctx context.Context, userID string) ([]*entities.CameraStorageConfig, error) {
	return uc.configRepo.ListByUser(ctx, userID)
}

// UpdateSubscription updates the subscription tier for a user's configs.
func (uc *ManageStorageConfigUseCase) UpdateSubscription(ctx context.Context, userID string, tier entities.SubscriptionTier) error {
	configs, err := uc.configRepo.ListByUser(ctx, userID)
	if err != nil {
		return err
	}
	for _, cfg := range configs {
		cfg.Subscription = tier
		if err := uc.configRepo.Update(ctx, cfg); err != nil {
			return err
		}
	}
	return nil
}
