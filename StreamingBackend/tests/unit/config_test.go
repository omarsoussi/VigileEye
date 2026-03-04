package unit

import (
	"os"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/vigileye/streaming-backend/internal/infrastructure/config"
)

func TestConfig_Defaults(t *testing.T) {
	// Clear env vars to test defaults
	envVars := []string{
		"PORT", "LOG_LEVEL", "JWT_SECRET", "CAMERA_SERVICE_URL",
		"FFMPEG_PATH", "DEFAULT_FPS", "DEFAULT_WIDTH", "DEFAULT_HEIGHT",
		"WEBRTC_PORT_MIN", "WEBRTC_PORT_MAX",
		"MEDIAMTX_ENABLED", "MEDIAMTX_API_URL", "MEDIAMTX_WHEP_URL",
	}
	for _, v := range envVars {
		os.Unsetenv(v)
	}

	cfg := config.Load()

	assert.Equal(t, 8003, cfg.Port)
	assert.Equal(t, "info", cfg.LogLevel)
	assert.Equal(t, "http://localhost:8002", cfg.CameraServiceURL)
	assert.Equal(t, "ffmpeg", cfg.FFmpegPath)
	assert.Equal(t, 15, cfg.DefaultFPS)
	assert.Equal(t, 1280, cfg.DefaultWidth)
	assert.Equal(t, 720, cfg.DefaultHeight)
	assert.Equal(t, 50000, cfg.WebRTCPortMin)
	assert.Equal(t, 50100, cfg.WebRTCPortMax)

	// MediaMTX defaults
	assert.True(t, cfg.MediaMTXEnabled)
	assert.Equal(t, "http://localhost:9997", cfg.MediaMTXAPIURL)
	assert.Equal(t, "http://localhost:8889", cfg.MediaMTXWHEPURL)
}

func TestConfig_OverrideWithEnv(t *testing.T) {
	os.Setenv("PORT", "9999")
	os.Setenv("JWT_SECRET", "custom-secret")
	os.Setenv("DEFAULT_FPS", "30")
	os.Setenv("MEDIAMTX_ENABLED", "false")
	os.Setenv("MEDIAMTX_API_URL", "http://mtx:9997")
	defer func() {
		os.Unsetenv("PORT")
		os.Unsetenv("JWT_SECRET")
		os.Unsetenv("DEFAULT_FPS")
		os.Unsetenv("MEDIAMTX_ENABLED")
		os.Unsetenv("MEDIAMTX_API_URL")
	}()

	cfg := config.Load()

	assert.Equal(t, 9999, cfg.Port)
	assert.Equal(t, "custom-secret", cfg.JWTSecret)
	assert.Equal(t, 30, cfg.DefaultFPS)
	assert.False(t, cfg.MediaMTXEnabled)
	assert.Equal(t, "http://mtx:9997", cfg.MediaMTXAPIURL)
}
