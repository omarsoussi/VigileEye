package usecases

import (
	"github.com/rs/zerolog/log"
	"github.com/vigileye/streaming-backend/internal/domain/entities"
	"github.com/vigileye/streaming-backend/internal/domain/services"
	"github.com/vigileye/streaming-backend/internal/infrastructure/streaming"
)

// StartStreamInput contains the input parameters for starting a stream.
type StartStreamInput struct {
	CameraID  string
	UserID    string
	Token     string
	StreamURL string
	Config    *entities.StreamConfig
}

// StartStreamUseCase handles starting a camera stream.
type StartStreamUseCase struct {
	streamManager *streaming.StreamManager
	cameraService services.CameraService
}

// NewStartStreamUseCase creates a new StartStreamUseCase.
func NewStartStreamUseCase(sm *streaming.StreamManager, cs services.CameraService) *StartStreamUseCase {
	return &StartStreamUseCase{
		streamManager: sm,
		cameraService: cs,
	}
}

// Execute starts a camera stream.
func (uc *StartStreamUseCase) Execute(input StartStreamInput) (*entities.StreamSession, error) {
	// Fetch camera details from Camera Management service
	camera, err := uc.cameraService.GetCamera(input.CameraID, input.Token)
	if err != nil {
		return nil, err
	}

	// Log if non-owner is starting (sharing via members service)
	if camera.OwnerUserID != input.UserID {
		log.Info().
			Str("user_id", input.UserID).
			Str("camera_id", input.CameraID).
			Str("owner_id", camera.OwnerUserID).
			Msg("Non-owner accessing camera stream")
	}

	streamURL := input.StreamURL
	if streamURL == "" {
		streamURL = camera.StreamURL
	}

	cfg := input.Config
	if cfg == nil {
		cfg = &entities.StreamConfig{FPS: camera.FPS}
	} else if cfg.FPS == 0 {
		cfg.FPS = camera.FPS
	}

	return uc.streamManager.StartStream(input.CameraID, camera.OwnerUserID, streamURL, cfg)
}
