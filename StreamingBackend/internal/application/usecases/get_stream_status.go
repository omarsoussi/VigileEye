package usecases

import (
	"fmt"

	"github.com/vigileye/streaming-backend/internal/domain/entities"
	"github.com/vigileye/streaming-backend/internal/infrastructure/config"
	"github.com/vigileye/streaming-backend/internal/infrastructure/streaming"
)

// StreamStatusResult contains stream status information.
type StreamStatusResult struct {
	CameraID     string
	IsStreaming  bool
	Status       string
	Session      *entities.StreamSession
	SignalingURL string
	WHEPEndpoint string // Direct WHEP URL for MediaMTX viewers
}

// GetStreamStatusUseCase handles getting stream status.
type GetStreamStatusUseCase struct {
	streamManager *streaming.StreamManager
	cfg           *config.Config
}

// NewGetStreamStatusUseCase creates a new GetStreamStatusUseCase.
func NewGetStreamStatusUseCase(sm *streaming.StreamManager, cfg *config.Config) *GetStreamStatusUseCase {
	return &GetStreamStatusUseCase{
		streamManager: sm,
		cfg:           cfg,
	}
}

// Execute returns the stream status for a camera.
func (uc *GetStreamStatusUseCase) Execute(cameraID string) *StreamStatusResult {
	session, _ := uc.streamManager.GetSession(cameraID)
	isStreaming := uc.streamManager.IsStreaming(cameraID)

	status := "stopped"
	if session != nil {
		status = string(session.Status)
	}

	signalingURL := ""
	whepEndpoint := ""
	if isStreaming {
		signalingURL = "/api/v1/webrtc/offer"

		if uc.streamManager.IsMediaMTXEnabled() {
			if uc.streamManager.IsCameraUsingMediaMTX(cameraID) {
				// Provide direct WHEP endpoint for frontend
				whepEndpoint = fmt.Sprintf("%s/%s/whep", uc.cfg.MediaMTXWHEPURL, cameraID)
			}
		}
	}

	return &StreamStatusResult{
		CameraID:     cameraID,
		IsStreaming:  isStreaming,
		Status:       status,
		Session:      session,
		SignalingURL: signalingURL,
		WHEPEndpoint: whepEndpoint,
	}
}
