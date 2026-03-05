package usecases

import (
	"context"

	"github.com/vigileye/storage-backend/internal/domain/entities"
	"github.com/vigileye/storage-backend/internal/domain/repositories"
	"github.com/vigileye/storage-backend/internal/infrastructure/recording"
)

// StopRecordingUseCase handles stopping a camera recording.
type StopRecordingUseCase struct {
	recManager    *recording.RecordingManager
	recordingRepo repositories.RecordingRepository
}

// NewStopRecordingUseCase creates a new use case.
func NewStopRecordingUseCase(
	rm *recording.RecordingManager,
	rr repositories.RecordingRepository,
) *StopRecordingUseCase {
	return &StopRecordingUseCase{
		recManager:    rm,
		recordingRepo: rr,
	}
}

// Execute stops recording for a camera.
func (uc *StopRecordingUseCase) Execute(ctx context.Context, cameraID string) (*entities.Recording, error) {
	rec, err := uc.recManager.StopRecording(ctx, cameraID)
	if err != nil {
		return nil, err
	}

	// Update in repository
	if err := uc.recordingRepo.Update(ctx, rec); err != nil {
		return nil, err
	}

	return rec, nil
}
