package usecases

import (
	"context"

	"github.com/vigileye/storage-backend/internal/domain/entities"
	"github.com/vigileye/storage-backend/internal/domain/repositories"
)

// ListRecordingsUseCase handles listing recordings.
type ListRecordingsUseCase struct {
	recordingRepo repositories.RecordingRepository
}

// NewListRecordingsUseCase creates a new use case.
func NewListRecordingsUseCase(rr repositories.RecordingRepository) *ListRecordingsUseCase {
	return &ListRecordingsUseCase{recordingRepo: rr}
}

// ByCamera lists recordings for a camera.
func (uc *ListRecordingsUseCase) ByCamera(ctx context.Context, cameraID string, limit, offset int) ([]*entities.Recording, error) {
	if limit <= 0 {
		limit = 50
	}
	return uc.recordingRepo.ListByCamera(ctx, cameraID, limit, offset)
}

// ByUser lists all recordings for a user.
func (uc *ListRecordingsUseCase) ByUser(ctx context.Context, userID string, limit, offset int) ([]*entities.Recording, error) {
	if limit <= 0 {
		limit = 50
	}
	return uc.recordingRepo.ListByUser(ctx, userID, limit, offset)
}
