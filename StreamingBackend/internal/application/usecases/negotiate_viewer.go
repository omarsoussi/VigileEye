package usecases

import (
	"github.com/google/uuid"
	"github.com/pion/webrtc/v4"
	"github.com/rs/zerolog/log"
	"github.com/vigileye/streaming-backend/internal/domain/services"
	"github.com/vigileye/streaming-backend/internal/infrastructure/streaming"
)

// NegotiateViewerInput contains the input for WebRTC negotiation.
type NegotiateViewerInput struct {
	CameraID string
	UserID   string
	Token    string
}

// NegotiateViewerUseCase handles WebRTC viewer negotiation.
type NegotiateViewerUseCase struct {
	streamManager *streaming.StreamManager
	cameraService services.CameraService
}

// NewNegotiateViewerUseCase creates a new NegotiateViewerUseCase.
func NewNegotiateViewerUseCase(sm *streaming.StreamManager, cs services.CameraService) *NegotiateViewerUseCase {
	return &NegotiateViewerUseCase{
		streamManager: sm,
		cameraService: cs,
	}
}

// NegotiateOffer handles a WebRTC SDP offer from a viewer.
// It auto-starts the stream if not already running, then returns the SDP answer.
func (uc *NegotiateViewerUseCase) NegotiateOffer(input NegotiateViewerInput, offer webrtc.SessionDescription) (*webrtc.SessionDescription, string, error) {
	// Auto-start stream if not running
	if !uc.streamManager.IsStreaming(input.CameraID) {
		log.Info().Str("camera_id", input.CameraID).Msg("Auto-starting stream for WebRTC viewer")
		camera, err := uc.cameraService.GetCamera(input.CameraID, input.Token)
		if err != nil {
			return nil, "", err
		}
		if _, err := uc.streamManager.StartStream(input.CameraID, camera.OwnerUserID, camera.StreamURL, nil); err != nil {
			return nil, "", err
		}
	}

	viewerID := uuid.New().String()
	uc.streamManager.AddViewer(input.CameraID)

	answer, err := uc.streamManager.NegotiateWebRTC(input.CameraID, viewerID, offer)
	if err != nil {
		uc.streamManager.RemoveViewer(input.CameraID)
		return nil, "", err
	}

	return answer, viewerID, nil
}

// AddICECandidate adds a trickle ICE candidate for a viewer.
func (uc *NegotiateViewerUseCase) AddICECandidate(cameraID, viewerID string, candidate webrtc.ICECandidateInit) error {
	return uc.streamManager.AddICECandidate(cameraID, viewerID, candidate)
}

// Disconnect cleans up a viewer connection.
func (uc *NegotiateViewerUseCase) Disconnect(cameraID, viewerID string) {
	uc.streamManager.DisconnectViewer(cameraID, viewerID)
}
