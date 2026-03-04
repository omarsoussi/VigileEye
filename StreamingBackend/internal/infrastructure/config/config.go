package config

import (
	"os"
	"runtime"
	"strconv"
)

// Config holds all application configuration loaded from environment variables.
type Config struct {
	Port  int
	GoEnv string

	// JWT
	JWTSecret    string
	JWTAlgorithm string

	// External services
	CameraServiceURL string
	AuthServiceURL   string

	// FFmpeg
	FFmpegPath  string
	FFprobePath string

	// ICE / TURN
	STUNServer     string
	TURNServer     string
	TURNUsername   string
	TURNCredential string

	// Stream defaults
	DefaultFPS           int
	DefaultWidth         int
	DefaultHeight        int
	DefaultBitrate       int
	MaxReconnectAttempts int
	ReconnectDelayMs     int

	// WebRTC
	WebRTCPortMin int
	WebRTCPortMax int

	// MediaMTX
	MediaMTXEnabled bool
	MediaMTXAPIURL  string // REST API: http://localhost:9997
	MediaMTXWHEPURL string // WHEP endpoint base: http://localhost:8889

	// Logging
	LogLevel string
}

// Load reads configuration from environment variables with sensible defaults.
func Load() *Config {
	return &Config{
		Port:  envInt("PORT", 8003),
		GoEnv: envStr("GO_ENV", "development"),

		JWTSecret:    envStr("JWT_SECRET", "your-super-secret-jwt-key-change-in-production-min-32-chars"),
		JWTAlgorithm: envStr("JWT_ALGORITHM", "HS256"),

		CameraServiceURL: envStr("CAMERA_SERVICE_URL", "http://localhost:8002"),
		AuthServiceURL:   envStr("AUTH_SERVICE_URL", "http://localhost:8000"),

		FFmpegPath:  envStr("FFMPEG_PATH", "ffmpeg"),
		FFprobePath: envStr("FFMPEG_PROBE_PATH", "ffprobe"),

		STUNServer:     envStr("STUN_SERVER", "stun:stun.l.google.com:19302"),
		TURNServer:     envStr("TURN_SERVER", ""),
		TURNUsername:   envStr("TURN_USERNAME", ""),
		TURNCredential: envStr("TURN_CREDENTIAL", ""),

		DefaultFPS:           envInt("DEFAULT_FPS", 15),
		DefaultWidth:         envInt("DEFAULT_WIDTH", 1280),
		DefaultHeight:        envInt("DEFAULT_HEIGHT", 720),
		DefaultBitrate:       envInt("DEFAULT_BITRATE", 2_000_000),
		MaxReconnectAttempts: envInt("MAX_RECONNECT_ATTEMPTS", 10),
		ReconnectDelayMs:     envInt("RECONNECT_DELAY_MS", 3000),

		WebRTCPortMin: envInt("WEBRTC_PORT_MIN", 50000),
		WebRTCPortMax: envInt("WEBRTC_PORT_MAX", 50100),

		MediaMTXEnabled: envBool("MEDIAMTX_ENABLED", true),
		MediaMTXAPIURL:  envStr("MEDIAMTX_API_URL", "http://localhost:9997"),
		MediaMTXWHEPURL: envStr("MEDIAMTX_WHEP_URL", "http://localhost:8889"),

		LogLevel: envStr("LOG_LEVEL", "info"),
	}
}

// NumWorkers returns the number of CPU cores for parallel processing.
func (c *Config) NumWorkers() int {
	n := envInt("NUM_WORKERS", 0)
	if n > 0 {
		return n
	}
	return runtime.NumCPU()
}

func envStr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func envInt(key string, fallback int) int {
	if v := os.Getenv(key); v != "" {
		if i, err := strconv.Atoi(v); err == nil {
			return i
		}
	}
	return fallback
}

func envBool(key string, fallback bool) bool {
	if v := os.Getenv(key); v != "" {
		if b, err := strconv.ParseBool(v); err == nil {
			return b
		}
	}
	return fallback
}
