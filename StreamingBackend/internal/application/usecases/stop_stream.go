package usecases

import (
	"github.com/vigileye/streaming-backend/internal/domain/entities"
	"github.com/vigileye/streaming-backend/internal/infrastructure/streaming"
)

// StopStreamUseCase handles stopping a camera stream.
type StopStreamUseCase struct {
	streamManager *streaming.StreamManager
}

// NewStopStreamUseCase creates a new StopStreamUseCase.
func NewStopStreamUseCase(sm *streaming.StreamManager) *StopStreamUseCase {
	return &StopStreamUseCase{streamManager: sm}
}

// Execute stops a camera stream.
func (uc *StopStreamUseCase) Execute(cameraID string) (*entities.StreamSession, error) {
	return uc.streamManager.StopStream(cameraID)
}
