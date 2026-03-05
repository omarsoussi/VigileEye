package usecases

import (
	"context"

	"github.com/vigileye/storage-backend/internal/domain/entities"
	"github.com/vigileye/storage-backend/internal/domain/repositories"
)

// GetStorageMetricsUseCase handles retrieving storage metrics.
type GetStorageMetricsUseCase struct {
	recordingRepo repositories.RecordingRepository
	configRepo    repositories.StorageConfigRepository
}

// NewGetStorageMetricsUseCase creates a new use case.
func NewGetStorageMetricsUseCase(
	rr repositories.RecordingRepository,
	cr repositories.StorageConfigRepository,
) *GetStorageMetricsUseCase {
	return &GetStorageMetricsUseCase{
		recordingRepo: rr,
		configRepo:    cr,
	}
}

// ForCamera returns storage metrics for a specific camera.
func (uc *GetStorageMetricsUseCase) ForCamera(ctx context.Context, cameraID, userID string) (*entities.StorageMetrics, error) {
	totalSize, err := uc.recordingRepo.GetTotalSizeByCamera(ctx, cameraID)
	if err != nil {
		return nil, err
	}

	count, err := uc.recordingRepo.CountByCamera(ctx, cameraID)
	if err != nil {
		return nil, err
	}

	quotaGB := 10.0
	config, _ := uc.configRepo.GetByCamera(ctx, cameraID)
	if config != nil {
		quotaGB = config.QuotaGB
	}

	totalGB := float64(totalSize) / (1024 * 1024 * 1024)
	usage := 0.0
	if quotaGB > 0 {
		usage = (totalGB / quotaGB) * 100
	}

	return &entities.StorageMetrics{
		CameraID:       cameraID,
		OwnerUserID:    userID,
		TotalFiles:     count,
		TotalSizeBytes: totalSize,
		TotalSizeGB:    totalGB,
		QuotaGB:        quotaGB,
		UsagePercent:   usage,
	}, nil
}

// ForUser returns aggregate storage metrics for a user.
func (uc *GetStorageMetricsUseCase) ForUser(ctx context.Context, userID string) (*entities.StorageMetrics, error) {
	totalSize, err := uc.recordingRepo.GetTotalSizeByUser(ctx, userID)
	if err != nil {
		return nil, err
	}

	configs, _ := uc.configRepo.ListByUser(ctx, userID)
	totalQuota := 0.0
	totalFiles := 0
	for _, c := range configs {
		totalQuota += c.QuotaGB
		count, _ := uc.recordingRepo.CountByCamera(ctx, c.CameraID)
		totalFiles += count
	}

	totalGB := float64(totalSize) / (1024 * 1024 * 1024)
	usage := 0.0
	if totalQuota > 0 {
		usage = (totalGB / totalQuota) * 100
	}

	return &entities.StorageMetrics{
		OwnerUserID:    userID,
		TotalFiles:     totalFiles,
		TotalSizeBytes: totalSize,
		TotalSizeGB:    totalGB,
		QuotaGB:        totalQuota,
		UsagePercent:   usage,
	}, nil
}
