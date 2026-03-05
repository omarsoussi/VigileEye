package routes

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/vigileye/storage-backend/internal/api/middleware"
	"github.com/vigileye/storage-backend/internal/application/dto"
	"github.com/vigileye/storage-backend/internal/application/usecases"
	"github.com/vigileye/storage-backend/internal/domain/entities"
	"github.com/vigileye/storage-backend/internal/domain/repositories"
	"github.com/vigileye/storage-backend/internal/domain/services"
	"github.com/vigileye/storage-backend/internal/infrastructure/config"
	"github.com/vigileye/storage-backend/internal/infrastructure/recording"
)

// HealthCheck returns service health status.
func HealthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":  "healthy",
		"service": "storage-backend",
		"version": "1.0.0",
	})
}

// StorageHandler bundles all storage-related HTTP handlers.
type StorageHandler struct {
	startRecUC    *usecases.StartRecordingUseCase
	stopRecUC     *usecases.StopRecordingUseCase
	listRecUC     *usecases.ListRecordingsUseCase
	metricsUC     *usecases.GetStorageMetricsUseCase
	configUC      *usecases.ManageStorageConfigUseCase
	recordingRepo repositories.RecordingRepository
	recManager    *recording.RecordingManager
	backend       services.StorageBackend
	cfg           *config.Config
	authService   services.AuthService
}

// NewStorageHandler creates a new storage handler.
func NewStorageHandler(
	startUC *usecases.StartRecordingUseCase,
	stopUC *usecases.StopRecordingUseCase,
	listUC *usecases.ListRecordingsUseCase,
	metricsUC *usecases.GetStorageMetricsUseCase,
	configUC *usecases.ManageStorageConfigUseCase,
	recRepo repositories.RecordingRepository,
	recMgr *recording.RecordingManager,
	backend services.StorageBackend,
	cfg *config.Config,
) *StorageHandler {
	return &StorageHandler{
		startRecUC:    startUC,
		stopRecUC:     stopUC,
		listRecUC:     listUC,
		metricsUC:     metricsUC,
		configUC:      configUC,
		recordingRepo: recRepo,
		recManager:    recMgr,
		backend:       backend,
		cfg:           cfg,
	}
}

// RegisterRoutes registers all storage routes on the given router group.
func (h *StorageHandler) RegisterRoutes(rg *gin.RouterGroup, authService services.AuthService) {
	h.authService = authService
	auth := middleware.AuthMiddleware(authService)

	storage := rg.Group("/storage")
	{
		// Recording management
		storage.POST("/recordings/start", auth, h.StartRecording)
		storage.POST("/recordings/stop", auth, h.StopRecording)
		storage.GET("/recordings", auth, h.ListRecordings)
		storage.GET("/recordings/:id", auth, h.GetRecording)
		storage.DELETE("/recordings/:id", auth, h.DeleteRecording)
		storage.GET("/recordings/active", auth, h.ListActiveRecordings)

		// Download / streaming (auth required)
		storage.GET("/download/:id", auth, h.DownloadRecording)
		storage.GET("/stream/:id", auth, h.StreamRecording)
		storage.GET("/thumbnail/:id", auth, h.GetThumbnail)

		// Token-based streaming for video player (no auth header needed, token in query)
		storage.GET("/stream-token/:id", auth, h.GetStreamToken)
		storage.GET("/play/:id", h.PlayRecording) // uses ?token= query param

		// Settings management per camera
		storage.GET("/settings/:cameraId", auth, h.GetSettings)
		storage.PUT("/settings/:cameraId", auth, h.UpdateSettings)
		storage.GET("/settings", auth, h.ListSettings)

		// Metrics
		storage.GET("/metrics", auth, h.GetUserMetrics)
		storage.GET("/metrics/:cameraId", auth, h.GetCameraMetrics)

		// Subscription
		storage.PUT("/subscription", auth, h.UpdateSubscription)
	}
}

// ─── Recording Handlers ────

// StartRecording starts recording a camera's stream.
func (h *StorageHandler) StartRecording(c *gin.Context) {
	var req dto.StartRecordingRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Detail: dto.ErrorDetail{Message: "Invalid request: " + err.Error(), ErrorCode: "VALIDATION_ERROR"},
		})
		return
	}

	user := middleware.GetUser(c)
	token := middleware.GetToken(c)

	rec, err := h.startRecUC.Execute(c.Request.Context(), usecases.StartRecordingInput{
		CameraID:    req.CameraID,
		OwnerUserID: user.Sub,
		StreamURL:   req.StreamURL,
		Token:       token,
	})
	if err != nil {
		// Return 409 if camera is already recording
		if strings.Contains(err.Error(), "already active") {
			c.JSON(http.StatusConflict, dto.ErrorResponse{
				Detail: dto.ErrorDetail{Message: err.Error(), ErrorCode: "RECORDING_ALREADY_ACTIVE"},
			})
			return
		}
		c.JSON(http.StatusInternalServerError, dto.ErrorResponse{
			Detail: dto.ErrorDetail{Message: err.Error(), ErrorCode: "RECORDING_START_FAILED"},
		})
		return
	}

	c.JSON(http.StatusOK, mapRecordingResponse(rec))
}

// StopRecording stops an active recording.
func (h *StorageHandler) StopRecording(c *gin.Context) {
	var req dto.StopRecordingRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Detail: dto.ErrorDetail{Message: "Invalid request: " + err.Error(), ErrorCode: "VALIDATION_ERROR"},
		})
		return
	}

	rec, err := h.stopRecUC.Execute(c.Request.Context(), req.CameraID)
	if err != nil {
		c.JSON(http.StatusNotFound, dto.ErrorResponse{
			Detail: dto.ErrorDetail{Message: err.Error(), ErrorCode: "RECORDING_NOT_FOUND"},
		})
		return
	}

	c.JSON(http.StatusOK, mapRecordingResponse(rec))
}

// ListRecordings lists recordings with optional camera_id filter.
func (h *StorageHandler) ListRecordings(c *gin.Context) {
	user := middleware.GetUser(c)
	cameraID := c.Query("camera_id")
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	var recs []*entities.Recording
	var err error
	if cameraID != "" {
		recs, err = h.listRecUC.ByCamera(c.Request.Context(), cameraID, limit, offset)
	} else {
		recs, err = h.listRecUC.ByUser(c.Request.Context(), user.Sub, limit, offset)
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.ErrorResponse{
			Detail: dto.ErrorDetail{Message: err.Error(), ErrorCode: "LIST_FAILED"},
		})
		return
	}

	response := make([]dto.RecordingResponse, 0, len(recs))
	for _, r := range recs {
		response = append(response, mapRecordingResponse(r))
	}

	c.JSON(http.StatusOK, gin.H{
		"recordings": response,
		"count":      len(response),
	})
}

// GetRecording returns a single recording by ID.
func (h *StorageHandler) GetRecording(c *gin.Context) {
	id := c.Param("id")
	rec, err := h.recordingRepo.GetByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, dto.ErrorResponse{
			Detail: dto.ErrorDetail{Message: "Recording not found", ErrorCode: "NOT_FOUND"},
		})
		return
	}
	c.JSON(http.StatusOK, mapRecordingResponse(rec))
}

// DeleteRecording deletes a recording.
func (h *StorageHandler) DeleteRecording(c *gin.Context) {
	id := c.Param("id")
	ctx := c.Request.Context()

	rec, err := h.recordingRepo.GetByID(ctx, id)
	if err != nil {
		c.JSON(http.StatusNotFound, dto.ErrorResponse{
			Detail: dto.ErrorDetail{Message: "Recording not found", ErrorCode: "NOT_FOUND"},
		})
		return
	}

	// Delete from storage backend
	_ = h.backend.Delete(ctx, rec.FilePath)

	// Mark as deleted
	rec.MarkDeleted()
	_ = h.recordingRepo.Update(ctx, rec)

	c.JSON(http.StatusOK, gin.H{"message": "Recording deleted", "id": id})
}

// ListActiveRecordings returns all currently active recordings.
func (h *StorageHandler) ListActiveRecordings(c *gin.Context) {
	active := h.recManager.GetActiveRecordings()
	response := make([]dto.RecordingResponse, 0, len(active))
	for _, r := range active {
		response = append(response, mapRecordingResponse(r))
	}
	c.JSON(http.StatusOK, dto.ActiveRecordingsResponse{
		Recordings: response,
		Count:      len(response),
	})
}

// ─── Download / Stream Handlers ────

// DownloadRecording serves a recording file for download.
func (h *StorageHandler) DownloadRecording(c *gin.Context) {
	id := c.Param("id")
	ctx := c.Request.Context()

	rec, err := h.recordingRepo.GetByID(ctx, id)
	if err != nil {
		c.JSON(http.StatusNotFound, dto.ErrorResponse{
			Detail: dto.ErrorDetail{Message: "Recording not found", ErrorCode: "NOT_FOUND"},
		})
		return
	}

	// For local storage, use http.ServeFile for proper Range support
	if h.cfg.StorageMode == "local" {
		filePath := filepath.Join(h.cfg.LocalStoragePath, rec.FilePath)
		c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s", rec.FileName))
		c.Header("Content-Type", "video/mp4")
		http.ServeFile(c.Writer, c.Request, filePath)
		return
	}

	reader, err := h.backend.Download(ctx, rec.FilePath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.ErrorResponse{
			Detail: dto.ErrorDetail{Message: "Failed to read recording", ErrorCode: "DOWNLOAD_FAILED"},
		})
		return
	}
	defer reader.Close()

	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s", rec.FileName))
	c.Header("Content-Type", "video/mp4")
	if rec.FileSize > 0 {
		c.Header("Content-Length", strconv.FormatInt(rec.FileSize, 10))
	}

	io.Copy(c.Writer, reader)
}

// StreamRecording serves a recording with HTTP range support for seeking.
func (h *StorageHandler) StreamRecording(c *gin.Context) {
	id := c.Param("id")
	ctx := c.Request.Context()

	rec, err := h.recordingRepo.GetByID(ctx, id)
	if err != nil {
		c.JSON(http.StatusNotFound, dto.ErrorResponse{
			Detail: dto.ErrorDetail{Message: "Recording not found", ErrorCode: "NOT_FOUND"},
		})
		return
	}

	// For local storage, use http.ServeFile for proper Range support
	if h.cfg.StorageMode == "local" {
		filePath := filepath.Join(h.cfg.LocalStoragePath, rec.FilePath)
		c.Header("Content-Type", "video/mp4")
		http.ServeFile(c.Writer, c.Request, filePath)
		return
	}

	// Fallback for cloud storage
	reader, err := h.backend.Download(ctx, rec.FilePath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.ErrorResponse{
			Detail: dto.ErrorDetail{Message: "Failed to stream recording", ErrorCode: "STREAM_FAILED"},
		})
		return
	}
	defer reader.Close()
	c.Header("Content-Type", "video/mp4")
	c.Header("Accept-Ranges", "bytes")
	if rec.FileSize > 0 {
		c.Header("Content-Length", strconv.FormatInt(rec.FileSize, 10))
	}
	io.Copy(c.Writer, reader)
}

// GetThumbnail serves a recording's thumbnail.
func (h *StorageHandler) GetThumbnail(c *gin.Context) {
	id := c.Param("id")
	rec, err := h.recordingRepo.GetByID(c.Request.Context(), id)
	if err != nil || rec.ThumbnailPath == "" {
		c.JSON(http.StatusNotFound, dto.ErrorResponse{
			Detail: dto.ErrorDetail{Message: "Thumbnail not found", ErrorCode: "NOT_FOUND"},
		})
		return
	}

	reader, err := h.backend.Download(context.Background(), rec.ThumbnailPath)
	if err != nil {
		c.JSON(http.StatusNotFound, dto.ErrorResponse{
			Detail: dto.ErrorDetail{Message: "Thumbnail not found", ErrorCode: "NOT_FOUND"},
		})
		return
	}
	defer reader.Close()

	c.Header("Content-Type", "image/jpeg")
	io.Copy(c.Writer, reader)
}

// GetStreamToken generates a short-lived token for video playback.
func (h *StorageHandler) GetStreamToken(c *gin.Context) {
	id := c.Param("id")
	user := middleware.GetUser(c)

	// Verify recording exists
	_, err := h.recordingRepo.GetByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, dto.ErrorResponse{
			Detail: dto.ErrorDetail{Message: "Recording not found", ErrorCode: "NOT_FOUND"},
		})
		return
	}

	// Generate a short-lived token (5 minutes)
	token, err := h.authService.GenerateDownloadToken(id, user.Sub, 300)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.ErrorResponse{
			Detail: dto.ErrorDetail{Message: "Failed to generate stream token", ErrorCode: "TOKEN_ERROR"},
		})
		return
	}

	c.JSON(http.StatusOK, dto.DownloadTokenResponse{
		URL:       fmt.Sprintf("/api/v1/storage/play/%s?token=%s", id, token),
		ExpiresAt: dto.FormatTime(c.GetTime("now")),
	})
}

// PlayRecording serves a recording file using a token from query params (no auth header needed).
func (h *StorageHandler) PlayRecording(c *gin.Context) {
	id := c.Param("id")
	token := c.Query("token")

	if token == "" {
		c.JSON(http.StatusUnauthorized, dto.ErrorResponse{
			Detail: dto.ErrorDetail{Message: "Token required", ErrorCode: "UNAUTHORIZED"},
		})
		return
	}

	// Validate the download token (not an access token)
	dlPayload, err := h.authService.ValidateDownloadToken(token)
	if err != nil || dlPayload == nil {
		c.JSON(http.StatusUnauthorized, dto.ErrorResponse{
			Detail: dto.ErrorDetail{Message: "Invalid or expired token", ErrorCode: "UNAUTHORIZED"},
		})
		return
	}

	rec, err := h.recordingRepo.GetByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, dto.ErrorResponse{
			Detail: dto.ErrorDetail{Message: "Recording not found", ErrorCode: "NOT_FOUND"},
		})
		return
	}

	// For local storage, use http.ServeFile for proper Range support and video playback
	if h.cfg.StorageMode == "local" {
		filePath := filepath.Join(h.cfg.LocalStoragePath, rec.FilePath)
		c.Header("Content-Type", "video/mp4")
		http.ServeFile(c.Writer, c.Request, filePath)
		return
	}

	// Fallback for cloud storage
	reader, err := h.backend.Download(c.Request.Context(), rec.FilePath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.ErrorResponse{
			Detail: dto.ErrorDetail{Message: "Failed to stream recording", ErrorCode: "STREAM_FAILED"},
		})
		return
	}
	defer reader.Close()
	c.Header("Content-Type", "video/mp4")
	c.Header("Accept-Ranges", "bytes")
	if rec.FileSize > 0 {
		c.Header("Content-Length", strconv.FormatInt(rec.FileSize, 10))
	}
	io.Copy(c.Writer, reader)
}

// ─── Settings Handlers ────

// GetSettings returns storage settings for a camera.
func (h *StorageHandler) GetSettings(c *gin.Context) {
	cameraID := c.Param("cameraId")
	user := middleware.GetUser(c)

	cfg, err := h.configUC.GetOrCreate(c.Request.Context(), cameraID, user.Sub)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.ErrorResponse{
			Detail: dto.ErrorDetail{Message: err.Error(), ErrorCode: "CONFIG_ERROR"},
		})
		return
	}

	c.JSON(http.StatusOK, mapConfigResponse(cfg))
}

// UpdateSettings updates storage settings for a camera.
func (h *StorageHandler) UpdateSettings(c *gin.Context) {
	cameraID := c.Param("cameraId")
	user := middleware.GetUser(c)

	var req dto.UpdateStorageConfigRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Detail: dto.ErrorDetail{Message: "Invalid request: " + err.Error(), ErrorCode: "VALIDATION_ERROR"},
		})
		return
	}

	updates := make(map[string]interface{})
	if req.Enabled != nil {
		updates["enabled"] = *req.Enabled
	}
	if req.StorageMode != "" {
		updates["storage_mode"] = req.StorageMode
	}
	if req.RetentionDays != nil {
		updates["retention_days"] = *req.RetentionDays
	}
	if req.QuotaGB != nil {
		updates["quota_gb"] = *req.QuotaGB
	}
	if req.Bitrate != nil {
		updates["bitrate"] = *req.Bitrate
	}
	if req.Resolution != "" {
		updates["resolution"] = req.Resolution
	}
	if req.SegmentMinutes != nil {
		updates["segment_minutes"] = *req.SegmentMinutes
	}

	cfg, err := h.configUC.Update(c.Request.Context(), cameraID, user.Sub, updates)
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Detail: dto.ErrorDetail{Message: err.Error(), ErrorCode: "CONFIG_UPDATE_FAILED"},
		})
		return
	}

	c.JSON(http.StatusOK, mapConfigResponse(cfg))
}

// ListSettings returns all storage configs for the authenticated user.
func (h *StorageHandler) ListSettings(c *gin.Context) {
	user := middleware.GetUser(c)
	configs, err := h.configUC.ListByUser(c.Request.Context(), user.Sub)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.ErrorResponse{
			Detail: dto.ErrorDetail{Message: err.Error(), ErrorCode: "LIST_FAILED"},
		})
		return
	}

	response := make([]dto.StorageConfigResponse, 0, len(configs))
	for _, cfg := range configs {
		response = append(response, mapConfigResponse(cfg))
	}

	c.JSON(http.StatusOK, gin.H{"configs": response, "count": len(response)})
}

// ─── Metrics Handlers ────

// GetUserMetrics returns aggregate storage metrics for the authenticated user.
func (h *StorageHandler) GetUserMetrics(c *gin.Context) {
	user := middleware.GetUser(c)
	metrics, err := h.metricsUC.ForUser(c.Request.Context(), user.Sub)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.ErrorResponse{
			Detail: dto.ErrorDetail{Message: err.Error(), ErrorCode: "METRICS_ERROR"},
		})
		return
	}
	c.JSON(http.StatusOK, mapMetricsResponse(metrics))
}

// GetCameraMetrics returns storage metrics for a specific camera.
func (h *StorageHandler) GetCameraMetrics(c *gin.Context) {
	cameraID := c.Param("cameraId")
	user := middleware.GetUser(c)

	metrics, err := h.metricsUC.ForCamera(c.Request.Context(), cameraID, user.Sub)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.ErrorResponse{
			Detail: dto.ErrorDetail{Message: err.Error(), ErrorCode: "METRICS_ERROR"},
		})
		return
	}
	c.JSON(http.StatusOK, mapMetricsResponse(metrics))
}

// ─── Subscription Handler ────

// UpdateSubscription updates the user's subscription tier.
func (h *StorageHandler) UpdateSubscription(c *gin.Context) {
	user := middleware.GetUser(c)
	var req dto.UpdateSubscriptionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Detail: dto.ErrorDetail{Message: "Invalid request: " + err.Error(), ErrorCode: "VALIDATION_ERROR"},
		})
		return
	}

	tier := entities.SubscriptionTier(req.Tier)
	if tier != entities.SubscriptionFree && tier != entities.SubscriptionPro {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Detail: dto.ErrorDetail{Message: "Invalid tier: must be FREE or PRO", ErrorCode: "VALIDATION_ERROR"},
		})
		return
	}

	if err := h.configUC.UpdateSubscription(c.Request.Context(), user.Sub, tier); err != nil {
		c.JSON(http.StatusInternalServerError, dto.ErrorResponse{
			Detail: dto.ErrorDetail{Message: err.Error(), ErrorCode: "SUBSCRIPTION_UPDATE_FAILED"},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Subscription updated", "tier": req.Tier})
}

// ─── Response Mappers ────

func mapRecordingResponse(r *entities.Recording) dto.RecordingResponse {
	return dto.RecordingResponse{
		ID:            r.ID,
		CameraID:      r.CameraID,
		OwnerUserID:   r.OwnerUserID,
		FileName:      r.FileName,
		FilePath:      r.FilePath,
		FileSize:      r.FileSize,
		DurationSecs:  r.DurationSecs,
		Resolution:    r.Resolution,
		Bitrate:       r.Bitrate,
		Format:        r.Format,
		ThumbnailPath: r.ThumbnailPath,
		StorageMode:   r.StorageMode,
		Status:        string(r.Status),
		StartedAt:     dto.FormatTime(r.StartedAt),
		EndedAt:       dto.FormatTimePtr(r.EndedAt),
		CreatedAt:     dto.FormatTime(r.CreatedAt),
	}
}

func mapConfigResponse(cfg *entities.CameraStorageConfig) dto.StorageConfigResponse {
	return dto.StorageConfigResponse{
		ID:             cfg.ID,
		CameraID:       cfg.CameraID,
		Enabled:        cfg.Enabled,
		StorageMode:    string(cfg.StorageMode),
		RetentionDays:  cfg.RetentionDays,
		QuotaGB:        cfg.QuotaGB,
		Bitrate:        cfg.Bitrate,
		Resolution:     cfg.Resolution,
		SegmentMinutes: cfg.SegmentMinutes,
		Subscription:   string(cfg.Subscription),
		CreatedAt:      dto.FormatTime(cfg.CreatedAt),
		UpdatedAt:      dto.FormatTime(cfg.UpdatedAt),
	}
}

func mapMetricsResponse(m *entities.StorageMetrics) dto.StorageMetricsResponse {
	return dto.StorageMetricsResponse{
		CameraID:       m.CameraID,
		OwnerUserID:    m.OwnerUserID,
		TotalFiles:     m.TotalFiles,
		TotalSizeBytes: m.TotalSizeBytes,
		TotalSizeGB:    m.TotalSizeGB,
		QuotaGB:        m.QuotaGB,
		UsagePercent:   m.UsagePercent,
	}
}
