package config

import (
	"os"
	"strconv"
	"strings"
)

// Config holds all application configuration loaded from environment variables.
type Config struct {
	Port  int
	GoEnv string

	// JWT
	JWTSecret    string
	JWTAlgorithm string

	// Database
	DatabaseURL string

	// External services
	CameraServiceURL    string
	StreamingServiceURL string

	// MediaMTX
	MediaMTXAPIURL  string
	MediaMTXRTSPURL string

	// FFmpeg
	FFmpegPath string

	// Storage mode
	StorageMode string // local, minio, azure

	// Local storage
	LocalStoragePath string

	// MinIO
	MinIOEndpoint  string
	MinIOAccessKey string
	MinIOSecretKey string
	MinIOBucket    string
	MinIOUseSSL    bool

	// Azure
	AzureConnectionString string
	AzureContainerName    string

	// Recording defaults
	SegmentDurationMinutes int
	DefaultRetentionDays   int
	DefaultQuotaGB         float64
	DefaultBitrate         int
	DefaultResolution      string

	// Subscription
	SubscriptionTier string

	// Logging
	LogLevel string
}

// Load reads configuration from environment variables with sensible defaults.
func Load() *Config {
	return &Config{
		Port:  envInt("PORT", 8004),
		GoEnv: envStr("GO_ENV", "development"),

		JWTSecret:    envStr("JWT_SECRET", "your-super-secret-jwt-key-change-in-production-min-32-chars"),
		JWTAlgorithm: envStr("JWT_ALGORITHM", "HS256"),

		DatabaseURL: envStr("DATABASE_URL", "postgres://localhost:5432/cmstorage?sslmode=disable"),

		CameraServiceURL:    envStr("CAMERA_SERVICE_URL", "http://localhost:8002"),
		StreamingServiceURL: envStr("STREAMING_SERVICE_URL", "http://localhost:8003"),

		MediaMTXAPIURL:  envStr("MEDIAMTX_API_URL", "http://localhost:9997"),
		MediaMTXRTSPURL: envStr("MEDIAMTX_RTSP_URL", "rtsp://localhost:8554"),

		FFmpegPath: envStr("FFMPEG_PATH", "ffmpeg"),

		StorageMode: strings.ToLower(envStr("STORAGE_MODE", "local")),

		LocalStoragePath: envStr("LOCAL_STORAGE_PATH", "./data/recordings"),

		MinIOEndpoint:  envStr("MINIO_ENDPOINT", "localhost:9000"),
		MinIOAccessKey: envStr("MINIO_ACCESS_KEY", "minioadmin"),
		MinIOSecretKey: envStr("MINIO_SECRET_KEY", "minioadmin"),
		MinIOBucket:    envStr("MINIO_BUCKET", "vigileeye-recordings"),
		MinIOUseSSL:    envBool("MINIO_USE_SSL", false),

		AzureConnectionString: envStr("AZURE_STORAGE_CONNECTION_STRING", ""),
		AzureContainerName:    envStr("AZURE_CONTAINER_NAME", "vigileeye-recordings"),

		SegmentDurationMinutes: envInt("SEGMENT_DURATION_MINUTES", 10),
		DefaultRetentionDays:   envInt("DEFAULT_RETENTION_DAYS", 7),
		DefaultQuotaGB:         envFloat("DEFAULT_QUOTA_GB", 10.0),
		DefaultBitrate:         envInt("DEFAULT_BITRATE", 2_000_000),
		DefaultResolution:      envStr("DEFAULT_RESOLUTION", "1280x720"),

		SubscriptionTier: envStr("SUBSCRIPTION_TIER", "FREE"),

		LogLevel: envStr("LOG_LEVEL", "info"),
	}
}

func envStr(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}

func envInt(key string, fallback int) int {
	if val := os.Getenv(key); val != "" {
		if n, err := strconv.Atoi(val); err == nil {
			return n
		}
	}
	return fallback
}

func envBool(key string, fallback bool) bool {
	if val := os.Getenv(key); val != "" {
		if b, err := strconv.ParseBool(val); err == nil {
			return b
		}
	}
	return fallback
}

func envFloat(key string, fallback float64) float64 {
	if val := os.Getenv(key); val != "" {
		if f, err := strconv.ParseFloat(val, 64); err == nil {
			return f
		}
	}
	return fallback
}
