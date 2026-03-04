package dto

import (
	"time"

	"github.com/vigileye/streaming-backend/internal/domain/entities"
)

// ─── Requests ───

// StartStreamRequest is the request body for starting a stream.
type StartStreamRequest struct {
	CameraID  string              `json:"camera_id" binding:"required"`
	StreamURL string              `json:"stream_url,omitempty"`
	Config    *StreamConfigDTO    `json:"config,omitempty"`
}

// StopStreamRequest is the request body for stopping a stream.
type StopStreamRequest struct {
	CameraID string `json:"camera_id" binding:"required"`
}

// StreamConfigDTO optionally overrides stream parameters.
type StreamConfigDTO struct {
	FPS     int    `json:"fps,omitempty"`
	Width   int    `json:"width,omitempty"`
	Height  int    `json:"height,omitempty"`
	Codec   string `json:"codec,omitempty"`
	Bitrate int    `json:"bitrate,omitempty"`
}

// WebRTCOfferRequest is the request body for WebRTC negotiation.
type WebRTCOfferRequest struct {
	CameraID string `json:"camera_id" binding:"required"`
	SDP      string `json:"sdp" binding:"required"`
	Type     string `json:"type" binding:"required"`
}

// ICECandidateRequest is the request body for trickle ICE.
type ICECandidateRequest struct {
	CameraID  string `json:"camera_id" binding:"required"`
	ViewerID  string `json:"viewer_id" binding:"required"`
	Candidate string `json:"candidate" binding:"required"`
	SDPMid    string `json:"sdp_mid,omitempty"`
	SDPMLineIndex *uint16 `json:"sdp_mline_index,omitempty"`
}

// ProbeRequest is the request body for probing a stream URL.
type ProbeRequest struct {
	StreamURL string `json:"stream_url" binding:"required"`
}

// ─── Responses ───

// StreamSessionResponse is the API response for a stream session.
type StreamSessionResponse struct {
	ID                string `json:"id"`
	CameraID          string `json:"camera_id"`
	Status            string `json:"status"`
	FPS               int    `json:"fps"`
	StartedAt         string `json:"started_at"`
	LastFrameAt       string `json:"last_frame_at"`
	StoppedAt         string `json:"stopped_at"`
	ErrorMessage      string `json:"error_message"`
	ReconnectAttempts int    `json:"reconnect_attempts"`
	ViewerCount       int    `json:"viewer_count"`
	CreatedAt         string `json:"created_at"`
	UpdatedAt         string `json:"updated_at"`
}

// StreamStatusResponse contains stream status with signaling info.
type StreamStatusResponse struct {
	CameraID     string                 `json:"camera_id"`
	IsStreaming  bool                   `json:"is_streaming"`
	Status       string                 `json:"status"`
	Session      *StreamSessionResponse `json:"session"`
	SignalingURL string                 `json:"signaling_url"`
	WHEPEndpoint string                 `json:"whep_endpoint,omitempty"`
}

// ActiveStreamsResponse lists all active streams.
type ActiveStreamsResponse struct {
	Count   int                      `json:"count"`
	Streams []*StreamSessionResponse `json:"streams"`
}

// RealTimeInfoResponse contains real-time streaming statistics.
type RealTimeInfoResponse struct {
	CameraID    string `json:"camera_id"`
	IsStreaming bool   `json:"is_streaming"`
	CurrentFPS  int    `json:"current_fps"`
	ViewerCount int    `json:"viewer_count"`
	HasAudio    bool   `json:"has_audio"`
	Status      string `json:"status"`
	Uptime      int64  `json:"uptime"`
	Bitrate     int64  `json:"bitrate"`
}

// WebRTCAnswerResponse contains the SDP answer for WebRTC negotiation.
type WebRTCAnswerResponse struct {
	ViewerID string `json:"viewer_id"`
	SDP      string `json:"sdp"`
	Type     string `json:"type"`
}

// ICEServersResponse contains ICE server configuration.
type ICEServersResponse struct {
	ICEServers []ICEServerDTO `json:"ice_servers"`
}

// ICEServerDTO represents an ICE server.
type ICEServerDTO struct {
	URLs       string `json:"urls"`
	Username   string `json:"username,omitempty"`
	Credential string `json:"credential,omitempty"`
}

// ErrorResponse is the standard error response.
type ErrorResponse struct {
	Detail ErrorDetail `json:"detail"`
}

// ErrorDetail provides error details.
type ErrorDetail struct {
	Message   string `json:"message"`
	ErrorCode string `json:"error_code"`
}

// ─── Mappers ───

// ToSessionResponse maps a domain entity to a response DTO.
func ToSessionResponse(s *entities.StreamSession) *StreamSessionResponse {
	return &StreamSessionResponse{
		ID:                s.ID,
		CameraID:          s.CameraID,
		Status:            string(s.Status),
		FPS:               s.Config.FPS,
		StartedAt:         formatTime(s.StartedAt),
		LastFrameAt:       formatTime(s.LastFrameAt),
		StoppedAt:         formatTime(s.StoppedAt),
		ErrorMessage:      s.ErrorMessage,
		ReconnectAttempts: s.ReconnectAttempts,
		ViewerCount:       s.ViewerCount,
		CreatedAt:         s.CreatedAt.Format(time.RFC3339),
		UpdatedAt:         s.UpdatedAt.Format(time.RFC3339),
	}
}

func formatTime(t *time.Time) string {
	if t == nil {
		return ""
	}
	return t.Format(time.RFC3339)
}
