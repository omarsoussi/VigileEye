package integration

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/vigileye/streaming-backend/internal/api/middleware"
	"github.com/vigileye/streaming-backend/internal/api/routes"
	"github.com/vigileye/streaming-backend/internal/application/dto"
	"github.com/vigileye/streaming-backend/internal/application/usecases"
	"github.com/vigileye/streaming-backend/internal/domain/entities"
	"github.com/vigileye/streaming-backend/internal/domain/services"
	"github.com/vigileye/streaming-backend/internal/infrastructure/config"
	"github.com/vigileye/streaming-backend/internal/infrastructure/persistence"
	"github.com/vigileye/streaming-backend/internal/infrastructure/security"
	"github.com/vigileye/streaming-backend/internal/infrastructure/streaming"
)

const testJWTSecret = "integration-test-secret"
const testUserID = "user-test-123"
const testEmail = "test@vigileye.com"

// ─── Test Setup ───

func setupRouter() (*gin.Engine, *streaming.StreamManager) {
	gin.SetMode(gin.TestMode)

	cfg := &config.Config{
		Port:                 8003,
		JWTSecret:            testJWTSecret,
		JWTAlgorithm:         "HS256",
		CameraServiceURL:     "http://localhost:8002",
		FFmpegPath:           "ffmpeg",
		FFprobePath:          "ffprobe",
		STUNServer:           "stun:stun.l.google.com:19302",
		DefaultFPS:           15,
		DefaultWidth:         1280,
		DefaultHeight:        720,
		WebRTCPortMin:        50000,
		WebRTCPortMax:        50100,
		MaxReconnectAttempts: 3,
		ReconnectDelayMs:     5000,
		MediaMTXEnabled:      false,
		MediaMTXAPIURL:       "http://localhost:9997",
		MediaMTXWHEPURL:      "http://localhost:8889",
		LogLevel:             "debug",
	}

	authService := security.NewJWTAuthService(cfg)
	sessionRepo := persistence.NewInMemoryStreamSessionRepo()
	streamManager := streaming.NewStreamManager(cfg, sessionRepo)

	// Use a mock camera service for integration tests
	mockCameraService := &mockCameraService{}

	startStreamUC := usecases.NewStartStreamUseCase(streamManager, mockCameraService)
	stopStreamUC := usecases.NewStopStreamUseCase(streamManager)
	getStatusUC := usecases.NewGetStreamStatusUseCase(streamManager, cfg)
	listActiveUC := usecases.NewListActiveStreamsUseCase(streamManager)
	negotiateUC := usecases.NewNegotiateViewerUseCase(streamManager, mockCameraService)

	router := gin.New()
	router.Use(gin.Recovery())

	router.GET("/health", routes.HealthCheck)

	v1 := router.Group("/api/v1")
	handler := routes.NewStreamHandler(startStreamUC, stopStreamUC, getStatusUC, listActiveUC, negotiateUC, streamManager, cfg)
	handler.RegisterRoutes(v1, authService)

	return router, streamManager
}

func createAuthToken() string {
	claims := jwt.MapClaims{
		"sub":   testUserID,
		"email": testEmail,
		"type":  "access",
		"exp":   time.Now().Add(1 * time.Hour).Unix(),
		"iat":   time.Now().Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenStr, _ := token.SignedString([]byte(testJWTSecret))
	return tokenStr
}

// ─── Mock Camera Service ───

type mockCameraService struct{}

func (m *mockCameraService) GetCamera(cameraID, token string) (*entities.Camera, error) {
	return &entities.Camera{
		ID:          cameraID,
		OwnerUserID: testUserID,
		Name:        "Test Camera",
		Description: "",
		StreamURL:   "rtsp://192.168.1.100:554/stream",
		Protocol:    "rtsp",
		Resolution:  "1280x720",
		FPS:         15,
		Encoding:    "h264",
		Status:      "online",
		CameraType:  "ip",
		IsActive:    true,
	}, nil
}

func (m *mockCameraService) GetCamerasForUser(userID, token string) ([]*entities.Camera, error) {
	return []*entities.Camera{
		{
			ID:          "cam-1",
			OwnerUserID: userID,
			Name:        "Front Door",
			Description: "",
			StreamURL:   "rtsp://192.168.1.100:554/stream",
			Protocol:    "rtsp",
			Resolution:  "1280x720",
			FPS:         15,
			Encoding:    "h264",
			Status:      "online",
			CameraType:  "ip",
			IsActive:    true,
		},
	}, nil
}

// Ensure mockCameraService implements the interface
var _ services.CameraService = (*mockCameraService)(nil)

// ─── Tests ───

func TestHealthCheck(t *testing.T) {
	router, _ := setupRouter()

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/health", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var resp map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &resp)
	require.NoError(t, err)
	assert.Equal(t, "healthy", resp["status"])
	assert.Equal(t, "streaming-backend", resp["service"])
}

func TestListActiveStreams_Empty(t *testing.T) {
	router, _ := setupRouter()
	token := createAuthToken()

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/v1/streams/active", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var resp dto.ActiveStreamsResponse
	err := json.Unmarshal(w.Body.Bytes(), &resp)
	require.NoError(t, err)
	assert.Equal(t, 0, resp.Count)
	assert.Empty(t, resp.Streams)
}

func TestGetStreamStatus_NotStreaming(t *testing.T) {
	router, _ := setupRouter()
	token := createAuthToken()

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/v1/streams/status/cam-1", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var resp dto.StreamStatusResponse
	err := json.Unmarshal(w.Body.Bytes(), &resp)
	require.NoError(t, err)
	assert.Equal(t, "cam-1", resp.CameraID)
	assert.False(t, resp.IsStreaming)
	assert.Equal(t, "stopped", resp.Status)
}

func TestUnauthorized_NoToken(t *testing.T) {
	router, _ := setupRouter()

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/v1/streams/active", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestUnauthorized_InvalidToken(t *testing.T) {
	router, _ := setupRouter()

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/v1/streams/active", nil)
	req.Header.Set("Authorization", "Bearer invalid-token")
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestGetICEServers(t *testing.T) {
	router, _ := setupRouter()
	token := createAuthToken()

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/v1/streams/ice-servers", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var resp dto.ICEServersResponse
	err := json.Unmarshal(w.Body.Bytes(), &resp)
	require.NoError(t, err)
	assert.NotEmpty(t, resp.ICEServers)
	assert.Contains(t, resp.ICEServers[0].URLs, "stun:")
}

func TestStartStream_InvalidBody(t *testing.T) {
	router, _ := setupRouter()
	token := createAuthToken()

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/v1/streams/start", strings.NewReader(`{}`))
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestStopStream_InvalidBody(t *testing.T) {
	router, _ := setupRouter()
	token := createAuthToken()

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/v1/streams/stop", strings.NewReader(`{}`))
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestGetLatestFrame_NoFrame(t *testing.T) {
	router, _ := setupRouter()
	token := createAuthToken()

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/v1/streams/frame/cam-nonexistent", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Equal(t, "image/jpeg", w.Header().Get("Content-Type"))
	assert.Equal(t, "1", w.Header().Get("X-VigileEye-Placeholder"))
	assert.True(t, len(w.Body.Bytes()) > 0)
}

func TestGetRealTimeInfo_NoStream(t *testing.T) {
	router, _ := setupRouter()
	token := createAuthToken()

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/v1/streams/realtime/cam-nonexistent", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNotFound, w.Code)
}

func TestWebRTCOffer_InvalidBody(t *testing.T) {
	router, _ := setupRouter()
	token := createAuthToken()

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/v1/webrtc/offer", strings.NewReader(`{}`))
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestWebRTCDisconnect_InvalidBody(t *testing.T) {
	router, _ := setupRouter()
	token := createAuthToken()

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/v1/webrtc/disconnect", strings.NewReader(`{}`))
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestMediaMTXStatus_Disabled(t *testing.T) {
	router, _ := setupRouter() // MediaMTX is disabled in test config

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/v1/mediamtx/status", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var body map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &body)
	require.NoError(t, err)
	assert.Equal(t, false, body["enabled"])
	assert.Equal(t, "legacy-pion", body["mode"])
}

func TestStreamStatus_IncludesWHEPEndpoint(t *testing.T) {
	router, _ := setupRouter() // MediaMTX disabled
	token := createAuthToken()

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/v1/streams/status/cam-123", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var body dto.StreamStatusResponse
	err := json.Unmarshal(w.Body.Bytes(), &body)
	require.NoError(t, err)
	assert.Equal(t, "cam-123", body.CameraID)
	assert.False(t, body.IsStreaming)
	// WHEP endpoint should be empty when not streaming
	assert.Empty(t, body.WHEPEndpoint)
}

func TestAuthMiddleware_BearerPrefix(t *testing.T) {
	router, _ := setupRouter()

	// Token without "Bearer " prefix
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/v1/streams/active", nil)
	req.Header.Set("Authorization", "Basic sometoken")
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

// ─── Auth Middleware Unit Tests ───

func TestAuthMiddleware_ExtractUser(t *testing.T) {
	cfg := &config.Config{JWTSecret: testJWTSecret, JWTAlgorithm: "HS256"}
	authService := security.NewJWTAuthService(cfg)
	token := createAuthToken()

	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.Use(middleware.AuthMiddleware(authService))
	router.GET("/test", func(c *gin.Context) {
		user := middleware.GetUser(c)
		assert.NotNil(t, user)
		assert.Equal(t, testUserID, user.Sub)
		assert.Equal(t, testEmail, user.Email)

		tok := middleware.GetToken(c)
		assert.Equal(t, token, tok)

		c.JSON(http.StatusOK, gin.H{"ok": true})
	})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/test", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}
