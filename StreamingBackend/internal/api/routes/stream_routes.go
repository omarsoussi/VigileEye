package routes

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/pion/webrtc/v4"
	"github.com/rs/zerolog/log"
	"github.com/vigileye/streaming-backend/internal/api/middleware"
	"github.com/vigileye/streaming-backend/internal/application/dto"
	"github.com/vigileye/streaming-backend/internal/application/usecases"
	"github.com/vigileye/streaming-backend/internal/domain/entities"
	domainerrors "github.com/vigileye/streaming-backend/internal/domain/errors"
	"github.com/vigileye/streaming-backend/internal/domain/services"
	"github.com/vigileye/streaming-backend/internal/infrastructure/streaming"
	"github.com/vigileye/streaming-backend/internal/infrastructure/config"
)

// StreamHandler bundles all stream-related HTTP handlers.
type StreamHandler struct {
	startStreamUC    *usecases.StartStreamUseCase
	stopStreamUC     *usecases.StopStreamUseCase
	getStatusUC      *usecases.GetStreamStatusUseCase
	listActiveUC     *usecases.ListActiveStreamsUseCase
	negotiateUC      *usecases.NegotiateViewerUseCase
	streamManager    *streaming.StreamManager
	config           *config.Config
}

// NewStreamHandler creates a new StreamHandler.
func NewStreamHandler(
	start *usecases.StartStreamUseCase,
	stop *usecases.StopStreamUseCase,
	status *usecases.GetStreamStatusUseCase,
	list *usecases.ListActiveStreamsUseCase,
	negotiate *usecases.NegotiateViewerUseCase,
	sm *streaming.StreamManager,
	cfg *config.Config,
) *StreamHandler {
	return &StreamHandler{
		startStreamUC: start,
		stopStreamUC:  stop,
		getStatusUC:   status,
		listActiveUC:  list,
		negotiateUC:   negotiate,
		streamManager: sm,
		config:        cfg,
	}
}

// RegisterRoutes registers all stream routes on the given router group.
func (h *StreamHandler) RegisterRoutes(rg *gin.RouterGroup, authService services.AuthService) {
	auth := middleware.AuthMiddleware(authService)

	streams := rg.Group("/streams")
	{
		streams.POST("/start", auth, h.StartStream)
		streams.POST("/stop", auth, h.StopStream)
		streams.GET("/status/:cameraId", auth, h.GetStreamStatus)
		streams.GET("/active", auth, h.ListActiveStreams)
		streams.GET("/realtime/:cameraId", auth, h.GetRealTimeInfo)
		streams.GET("/frame/:cameraId", auth, h.GetLatestFrame)
		streams.GET("/ice-servers", auth, h.GetICEServers)
		streams.POST("/probe", auth, h.ProbeStream)
	}

	webrtc := rg.Group("/webrtc")
	{
		webrtc.POST("/offer", auth, h.WebRTCOffer)
		webrtc.POST("/ice-candidate", auth, h.WebRTCICECandidate)
		webrtc.POST("/disconnect", auth, h.WebRTCDisconnect)
	}

	// MediaMTX info endpoint (public, for diagnostics)
	rg.GET("/mediamtx/status", h.MediaMTXStatus)
}

// ─── Stream CRUD ───

// StartStream godoc
// @Summary Start streaming a camera
// @Param body body dto.StartStreamRequest true "Start stream request"
// @Success 200 {object} dto.StreamSessionResponse
// @Router /api/v1/streams/start [post]
func (h *StreamHandler) StartStream(c *gin.Context) {
	var req dto.StartStreamRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Detail: dto.ErrorDetail{Message: "Invalid request body: " + err.Error(), ErrorCode: "VALIDATION_ERROR"},
		})
		return
	}

	user := middleware.GetUser(c)
	token := middleware.GetToken(c)

	session, err := h.startStreamUC.Execute(usecases.StartStreamInput{
		CameraID:  req.CameraID,
		UserID:    user.Sub,
		Token:     token,
		StreamURL: req.StreamURL,
		Config:    toStreamConfig(req.Config),
	})
	if err != nil {
		handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, dto.ToSessionResponse(session))
}

// StopStream godoc
// @Summary Stop streaming a camera
// @Param body body dto.StopStreamRequest true "Stop stream request"
// @Success 200 {object} dto.StreamSessionResponse
// @Router /api/v1/streams/stop [post]
func (h *StreamHandler) StopStream(c *gin.Context) {
	var req dto.StopStreamRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Detail: dto.ErrorDetail{Message: "Invalid request body: " + err.Error(), ErrorCode: "VALIDATION_ERROR"},
		})
		return
	}

	session, err := h.stopStreamUC.Execute(req.CameraID)
	if err != nil {
		handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, dto.ToSessionResponse(session))
}

// GetStreamStatus godoc
// @Summary Get stream status for a camera
// @Param cameraId path string true "Camera ID"
// @Success 200 {object} dto.StreamStatusResponse
// @Router /api/v1/streams/status/{cameraId} [get]
func (h *StreamHandler) GetStreamStatus(c *gin.Context) {
	cameraID := c.Param("cameraId")

	result := h.getStatusUC.Execute(cameraID)

	var sessionResp *dto.StreamSessionResponse
	if result.Session != nil {
		sessionResp = dto.ToSessionResponse(result.Session)
	}

	c.JSON(http.StatusOK, dto.StreamStatusResponse{
		CameraID:     result.CameraID,
		IsStreaming:  result.IsStreaming,
		Status:       result.Status,
		Session:      sessionResp,
		SignalingURL: result.SignalingURL,
		WHEPEndpoint: result.WHEPEndpoint,
	})
}

// ListActiveStreams godoc
// @Summary List all active streams
// @Success 200 {object} dto.ActiveStreamsResponse
// @Router /api/v1/streams/active [get]
func (h *StreamHandler) ListActiveStreams(c *gin.Context) {
	count, sessions := h.listActiveUC.Execute()

	streamResponses := make([]*dto.StreamSessionResponse, len(sessions))
	for i, s := range sessions {
		streamResponses[i] = dto.ToSessionResponse(s)
	}

	c.JSON(http.StatusOK, dto.ActiveStreamsResponse{
		Count:   count,
		Streams: streamResponses,
	})
}

// GetRealTimeInfo godoc
// @Summary Get real-time streaming statistics
// @Param cameraId path string true "Camera ID"
// @Success 200 {object} dto.RealTimeInfoResponse
// @Router /api/v1/streams/realtime/{cameraId} [get]
func (h *StreamHandler) GetRealTimeInfo(c *gin.Context) {
	cameraID := c.Param("cameraId")

	info := h.streamManager.GetRealTimeInfo(cameraID)
	if info == nil {
		c.JSON(http.StatusNotFound, dto.ErrorResponse{
			Detail: dto.ErrorDetail{Message: "Stream not found", ErrorCode: "STREAM_NOT_FOUND"},
		})
		return
	}

	c.JSON(http.StatusOK, dto.RealTimeInfoResponse{
		CameraID:    cameraID,
		IsStreaming:  h.streamManager.IsStreaming(cameraID),
		CurrentFPS:  info.CurrentFPS,
		ViewerCount: info.ViewerCount,
		HasAudio:    info.HasAudio,
		Status:      info.Status,
		Uptime:      info.Uptime,
		Bitrate:     info.Bitrate,
	})
}

// GetLatestFrame godoc
// @Summary Get latest JPEG frame for HTTP polling fallback
// @Param cameraId path string true "Camera ID"
// @Success 200 {file} binary "JPEG frame"
// @Router /api/v1/streams/frame/{cameraId} [get]
func (h *StreamHandler) GetLatestFrame(c *gin.Context) {
	cameraID := c.Param("cameraId")

	frame := h.streamManager.GetLatestFrame(cameraID)
	if frame == nil {
		c.JSON(http.StatusNotFound, dto.ErrorResponse{
			Detail: dto.ErrorDetail{Message: "No frame available", ErrorCode: "FRAME_NOT_FOUND"},
		})
		return
	}

	c.Data(http.StatusOK, "image/jpeg", frame)
}

// GetICEServers godoc
// @Summary Get ICE server configuration for WebRTC
// @Success 200 {object} dto.ICEServersResponse
// @Router /api/v1/streams/ice-servers [get]
func (h *StreamHandler) GetICEServers(c *gin.Context) {
	servers := h.streamManager.GetICEServers()

	iceServers := make([]dto.ICEServerDTO, len(servers))
	for i, s := range servers {
		iceServers[i] = dto.ICEServerDTO{
			URLs:       s.URLs,
			Username:   s.Username,
			Credential: s.Credential,
		}
	}

	c.JSON(http.StatusOK, dto.ICEServersResponse{ICEServers: iceServers})
}

// ProbeStream godoc
// @Summary Probe a stream URL for media info
// @Param body body dto.ProbeRequest true "Probe request"
// @Success 200 {object} map[string]interface{}
// @Router /api/v1/streams/probe [post]
func (h *StreamHandler) ProbeStream(c *gin.Context) {
	var req dto.ProbeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Detail: dto.ErrorDetail{Message: "Invalid request body: " + err.Error(), ErrorCode: "VALIDATION_ERROR"},
		})
		return
	}

	// Get ffprobe path from config
	ffprobePath := "ffprobe" // default
	if h.config != nil && h.config.FFprobePath != "" {
		ffprobePath = h.config.FFprobePath
	}

	info, err := streaming.ProbeStream(ffprobePath, req.StreamURL)
	if err != nil {
		c.JSON(http.StatusBadGateway, dto.ErrorResponse{
			Detail: dto.ErrorDetail{Message: "Failed to probe stream: " + err.Error(), ErrorCode: "PROBE_FAILED"},
		})
		return
	}

	c.JSON(http.StatusOK, info)
}

// ─── WebRTC Signaling (HTTP-based, no WebSocket) ───

// WebRTCOffer godoc
// @Summary Send an SDP offer to start WebRTC viewer session
// @Param body body dto.WebRTCOfferRequest true "WebRTC offer"
// @Success 200 {object} dto.WebRTCAnswerResponse
// @Router /api/v1/webrtc/offer [post]
func (h *StreamHandler) WebRTCOffer(c *gin.Context) {
	var req dto.WebRTCOfferRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Detail: dto.ErrorDetail{Message: "Invalid request body: " + err.Error(), ErrorCode: "VALIDATION_ERROR"},
		})
		return
	}

	user := middleware.GetUser(c)
	token := middleware.GetToken(c)

	offer := webrtc.SessionDescription{
		Type: webrtc.SDPTypeOffer,
		SDP:  req.SDP,
	}

	answer, viewerID, err := h.negotiateUC.NegotiateOffer(usecases.NegotiateViewerInput{
		CameraID: req.CameraID,
		UserID:   user.Sub,
		Token:    token,
	}, offer)
	if err != nil {
		handleError(c, err)
		return
	}

	log.Info().
		Str("camera_id", req.CameraID).
		Str("viewer_id", viewerID).
		Str("user_id", user.Sub).
		Msg("WebRTC viewer connected via HTTP offer")

	c.JSON(http.StatusOK, dto.WebRTCAnswerResponse{
		ViewerID: viewerID,
		SDP:      answer.SDP,
		Type:     answer.Type.String(),
	})
}

// WebRTCICECandidate godoc
// @Summary Add an ICE candidate for trickle ICE
// @Param body body dto.ICECandidateRequest true "ICE candidate"
// @Success 204
// @Router /api/v1/webrtc/ice-candidate [post]
func (h *StreamHandler) WebRTCICECandidate(c *gin.Context) {
	var req dto.ICECandidateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Detail: dto.ErrorDetail{Message: "Invalid request body: " + err.Error(), ErrorCode: "VALIDATION_ERROR"},
		})
		return
	}

	candidate := webrtc.ICECandidateInit{
		Candidate:     req.Candidate,
		SDPMid:        &req.SDPMid,
		SDPMLineIndex: req.SDPMLineIndex,
	}

	if err := h.negotiateUC.AddICECandidate(req.CameraID, req.ViewerID, candidate); err != nil {
		handleError(c, err)
		return
	}

	c.Status(http.StatusNoContent)
}

// WebRTCDisconnect godoc
// @Summary Disconnect a WebRTC viewer
// @Param body body map[string]string true "camera_id and viewer_id"
// @Success 204
// @Router /api/v1/webrtc/disconnect [post]
func (h *StreamHandler) WebRTCDisconnect(c *gin.Context) {
	var req struct {
		CameraID string `json:"camera_id" binding:"required"`
		ViewerID string `json:"viewer_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Detail: dto.ErrorDetail{Message: "Invalid request body: " + err.Error(), ErrorCode: "VALIDATION_ERROR"},
		})
		return
	}

	h.negotiateUC.Disconnect(req.CameraID, req.ViewerID)
	c.Status(http.StatusNoContent)
}

// ─── Health ───

// HealthCheck returns service health.
func HealthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":  "healthy",
		"service": "streaming-backend",
	})
}

// MediaMTXStatus returns MediaMTX connection status.
func (h *StreamHandler) MediaMTXStatus(c *gin.Context) {
	if !h.streamManager.IsMediaMTXEnabled() {
		c.JSON(http.StatusOK, gin.H{
			"enabled": false,
			"mode":    "legacy-pion",
			"message": "MediaMTX is disabled, using direct FFmpeg/pion pipeline",
		})
		return
	}

	mtxClient := h.streamManager.GetMediaMTXClient()
	healthy := mtxClient.IsHealthy()

	paths, _ := mtxClient.ListPaths()
	pathCount := 0
	if paths != nil {
		pathCount = paths.ItemCount
	}

	c.JSON(http.StatusOK, gin.H{
		"enabled":      true,
		"mode":         "mediamtx",
		"healthy":      healthy,
		"api_url":      h.config.MediaMTXAPIURL,
		"whep_url":     h.config.MediaMTXWHEPURL,
		"active_paths": pathCount,
	})
}

// ─── Helpers ───

func toStreamConfig(dto *dto.StreamConfigDTO) *entities.StreamConfig {
	if dto == nil {
		return nil
	}
	return &entities.StreamConfig{
		FPS:     dto.FPS,
		Width:   dto.Width,
		Height:  dto.Height,
		Codec:   dto.Codec,
		Bitrate: dto.Bitrate,
	}
}

func handleError(c *gin.Context, err error) {
	switch e := err.(type) {
	case *domainerrors.CameraNotFoundError:
		c.JSON(http.StatusNotFound, dto.ErrorResponse{
			Detail: dto.ErrorDetail{Message: e.Message, ErrorCode: e.Code},
		})
	case *domainerrors.StreamNotFoundError:
		c.JSON(http.StatusNotFound, dto.ErrorResponse{
			Detail: dto.ErrorDetail{Message: e.Message, ErrorCode: e.Code},
		})
	case *domainerrors.StreamAlreadyActiveError:
		c.JSON(http.StatusConflict, dto.ErrorResponse{
			Detail: dto.ErrorDetail{Message: e.Message, ErrorCode: e.Code},
		})
	case *domainerrors.UnauthorizedError:
		c.JSON(http.StatusUnauthorized, dto.ErrorResponse{
			Detail: dto.ErrorDetail{Message: e.Message, ErrorCode: e.Code},
		})
	case *domainerrors.ForbiddenError:
		c.JSON(http.StatusForbidden, dto.ErrorResponse{
			Detail: dto.ErrorDetail{Message: e.Message, ErrorCode: e.Code},
		})
	case *domainerrors.ValidationError:
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Detail: dto.ErrorDetail{Message: e.Message, ErrorCode: e.Code},
		})
	case *domainerrors.StreamConnectionError:
		c.JSON(http.StatusServiceUnavailable, dto.ErrorResponse{
			Detail: dto.ErrorDetail{Message: e.Message, ErrorCode: e.Code},
		})
	case *domainerrors.IngestFailedError:
		c.JSON(http.StatusBadGateway, dto.ErrorResponse{
			Detail: dto.ErrorDetail{Message: e.Message, ErrorCode: e.Code},
		})
	default:
		log.Error().Err(err).Msg("Unhandled error")
		c.JSON(http.StatusInternalServerError, dto.ErrorResponse{
			Detail: dto.ErrorDetail{Message: "Internal server error", ErrorCode: "INTERNAL_ERROR"},
		})
	}
}
