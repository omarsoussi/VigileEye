package recording

import (
	"context"
	"time"

	"github.com/robfig/cron/v3"
	"github.com/rs/zerolog/log"
	"github.com/vigileye/storage-backend/internal/domain/repositories"
	"github.com/vigileye/storage-backend/internal/domain/services"
)

// RetentionCleaner runs periodic cleanup of expired recordings.
type RetentionCleaner struct {
	cronScheduler *cron.Cron
	recordingRepo repositories.RecordingRepository
	configRepo    repositories.StorageConfigRepository
	backend       services.StorageBackend
}

// NewRetentionCleaner creates a new retention cleaner.
func NewRetentionCleaner(
	recRepo repositories.RecordingRepository,
	cfgRepo repositories.StorageConfigRepository,
	backend services.StorageBackend,
) *RetentionCleaner {
	return &RetentionCleaner{
		cronScheduler: cron.New(),
		recordingRepo: recRepo,
		configRepo:    cfgRepo,
		backend:       backend,
	}
}

// Start begins the retention cleanup cron job (runs every hour).
func (rc *RetentionCleaner) Start() {
	_, err := rc.cronScheduler.AddFunc("0 * * * *", rc.cleanup) // every hour
	if err != nil {
		log.Error().Err(err).Msg("Failed to schedule retention cleanup")
		return
	}
	rc.cronScheduler.Start()
	log.Info().Msg("Retention cleaner started (runs every hour)")
}

// Stop stops the cron scheduler.
func (rc *RetentionCleaner) Stop() {
	rc.cronScheduler.Stop()
}

func (rc *RetentionCleaner) cleanup() {
	ctx := context.Background()
	log.Info().Msg("Running retention cleanup...")

	configs, err := rc.configRepo.ListEnabled(ctx)
	if err != nil {
		log.Error().Err(err).Msg("Failed to list enabled configs for cleanup")
		return
	}

	totalDeleted := 0
	for _, cfg := range configs {
		cutoff := time.Now().UTC().AddDate(0, 0, -cfg.RetentionDays).Unix()

		deleted, err := rc.recordingRepo.DeleteOlderThan(ctx, cfg.CameraID, cutoff)
		if err != nil {
			log.Error().Err(err).Str("camera_id", cfg.CameraID).Msg("Failed to cleanup recordings")
			continue
		}

		if deleted > 0 {
			log.Info().
				Str("camera_id", cfg.CameraID).
				Int("deleted", deleted).
				Int("retention_days", cfg.RetentionDays).
				Msg("Cleaned up old recordings")
			totalDeleted += deleted
		}

		// Also enforce quota
		rc.enforceQuota(ctx, cfg.CameraID, cfg.QuotaGB)
	}

	log.Info().Int("total_deleted", totalDeleted).Msg("Retention cleanup completed")
}

func (rc *RetentionCleaner) enforceQuota(ctx context.Context, cameraID string, quotaGB float64) {
	totalSize, err := rc.recordingRepo.GetTotalSizeByCamera(ctx, cameraID)
	if err != nil {
		return
	}

	quotaBytes := int64(quotaGB * 1024 * 1024 * 1024)
	if totalSize <= quotaBytes {
		return
	}

	log.Warn().
		Str("camera_id", cameraID).
		Int64("total_bytes", totalSize).
		Int64("quota_bytes", quotaBytes).
		Msg("Camera over storage quota, deleting oldest recordings")

	// Delete oldest recording to free space
	oldest, err := rc.recordingRepo.GetOldestByCamera(ctx, cameraID)
	if err != nil || oldest == nil {
		return
	}

	// Delete from storage backend
	_ = rc.backend.Delete(ctx, oldest.FilePath)

	// Mark as deleted in DB
	oldest.MarkDeleted()
	_ = rc.recordingRepo.Update(ctx, oldest)
}
