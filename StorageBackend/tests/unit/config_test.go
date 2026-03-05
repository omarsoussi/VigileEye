package unit

import (
	"os"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/vigileye/storage-backend/internal/infrastructure/config"
)

func TestConfig_Defaults(t *testing.T) {
	// Clear all env vars that might interfere
	envVars := []string{"PORT", "STORAGE_MODE", "LOCAL_STORAGE_PATH", "JWT_SECRET"}
	saved := make(map[string]string)
	for _, k := range envVars {
		saved[k] = os.Getenv(k)
		os.Unsetenv(k)
	}
	defer func() {
		for k, v := range saved {
			if v != "" {
				os.Setenv(k, v)
			}
		}
	}()

	cfg := config.Load()

	assert.Equal(t, 8004, cfg.Port)
	assert.Equal(t, "local", cfg.StorageMode)
	assert.Equal(t, "./data/recordings", cfg.LocalStoragePath)
	assert.Equal(t, "HS256", cfg.JWTAlgorithm)
	assert.Equal(t, 10, cfg.SegmentDurationMinutes)
	assert.Equal(t, 7, cfg.DefaultRetentionDays)
	assert.Equal(t, 10.0, cfg.DefaultQuotaGB)
	assert.Equal(t, "FREE", cfg.SubscriptionTier)
}

func TestConfig_FromEnv(t *testing.T) {
	os.Setenv("PORT", "9999")
	os.Setenv("STORAGE_MODE", "minio")
	os.Setenv("DEFAULT_RETENTION_DAYS", "30")
	defer func() {
		os.Unsetenv("PORT")
		os.Unsetenv("STORAGE_MODE")
		os.Unsetenv("DEFAULT_RETENTION_DAYS")
	}()

	cfg := config.Load()
	assert.Equal(t, 9999, cfg.Port)
	assert.Equal(t, "minio", cfg.StorageMode)
	assert.Equal(t, 30, cfg.DefaultRetentionDays)
}
