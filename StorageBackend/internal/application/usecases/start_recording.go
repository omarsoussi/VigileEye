package usecases

import (
	"context"
	"fmt"
	"strings"

	"github.com/vigileye/storage-backend/internal/domain/entities"
	"github.com/vigileye/storage-backend/internal/domain/repositories"
	"github.com/vigileye/storage-backend/internal/domain/services"
	"github.com/vigileye/storage-backend/internal/infrastructure/config"
	"github.com/vigileye/storage-backend/internal/infrastructure/recording"
)

// StartRecordingInput holds the input for starting a recording.
type StartRecordingInput struct {
	CameraID    string
	OwnerUserID string
	StreamURL   string
	Token       string
}

// StartRecordingUseCase handles starting a camera recording.
type StartRecordingUseCase struct {
	recManager    *recording.RecordingManager
	cameraService services.CameraService
	recordingRepo repositories.RecordingRepository
	configRepo    repositories.StorageConfigRepository
	cfg           *config.Config
}

// NewStartRecordingUseCase creates a new use case.
func NewStartRecordingUseCase(
	rm *recording.RecordingManager,
	cs services.CameraService,
	rr repositories.RecordingRepository,
	cr repositories.StorageConfigRepository,
	cfg *config.Config,
) *StartRecordingUseCase {
	return &StartRecordingUseCase{
		recManager:    rm,
		cameraService: cs,
		recordingRepo: rr,
		configRepo:    cr,
		cfg:           cfg,
	}
}

// Execute starts recording a camera.
func (uc *StartRecordingUseCase) Execute(ctx context.Context, input StartRecordingInput) (*entities.Recording, error) {
	// Verify camera exists and user has access
	camera, err := uc.cameraService.GetCamera(input.CameraID, input.Token)
	if err != nil {
		return nil, err
	}

	if camera.OwnerUserID != input.OwnerUserID {
		return nil, fmt.Errorf("access denied to camera %s", input.CameraID)
	}

	// Get or create storage config
	storageConfig, _ := uc.configRepo.GetByCamera(ctx, input.CameraID)
	if storageConfig == nil {
		storageConfig = entities.NewCameraStorageConfig(input.CameraID, input.OwnerUserID)
		_ = uc.configRepo.Create(ctx, storageConfig)
	}

	// Determine stream URL
	streamURL := input.StreamURL
	if streamURL == "" {
		streamURL = camera.StreamURL
	}

	// In Docker, rewrite localhost RTSP URLs to use the MediaMTX service hostname
	if uc.cfg != nil && uc.cfg.MediaMTXRTSPURL != "" {
		if strings.Contains(streamURL, "localhost:8554") || strings.Contains(streamURL, "127.0.0.1:8554") {
			// Extract path from the original URL (e.g., rtsp://localhost:8554/cam1 → /cam1)
			for _, prefix := range []string{"rtsp://localhost:8554", "rtsp://127.0.0.1:8554"} {
				if strings.HasPrefix(streamURL, prefix) {
					path := strings.TrimPrefix(streamURL, prefix)
					streamURL = uc.cfg.MediaMTXRTSPURL + path
					break
				}
			}
		}
	}

	// Start recording
	rec, err := uc.recManager.StartRecording(ctx, input.CameraID, input.OwnerUserID, streamURL, storageConfig)
	if err != nil {
		return nil, err
	}

	// Persist recording metadata
	if err := uc.recordingRepo.Create(ctx, rec); err != nil {
		return nil, fmt.Errorf("failed to persist recording: %w", err)
	}

	return rec, nil
}
