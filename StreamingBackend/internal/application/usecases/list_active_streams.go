package usecases

import (
	"github.com/vigileye/streaming-backend/internal/domain/entities"
	"github.com/vigileye/streaming-backend/internal/infrastructure/streaming"
)

// ListActiveStreamsUseCase handles listing all active streams.
type ListActiveStreamsUseCase struct {
	streamManager *streaming.StreamManager
}

// NewListActiveStreamsUseCase creates a new ListActiveStreamsUseCase.
func NewListActiveStreamsUseCase(sm *streaming.StreamManager) *ListActiveStreamsUseCase {
	return &ListActiveStreamsUseCase{streamManager: sm}
}

// Execute returns all active streams.
func (uc *ListActiveStreamsUseCase) Execute() (int, []*entities.StreamSession) {
	streams := uc.streamManager.GetAllSessions()
	return len(streams), streams
}
