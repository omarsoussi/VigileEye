package unit

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/vigileye/streaming-backend/internal/domain/errors"
)

func TestCameraNotFoundError(t *testing.T) {
	err := errors.NewCameraNotFoundError("cam-123")
	assert.Equal(t, "Camera cam-123 not found", err.Message)
	assert.Equal(t, "CAMERA_NOT_FOUND", err.Code)
	assert.Contains(t, err.Error(), "Camera cam-123 not found")
}

func TestStreamAlreadyActiveError(t *testing.T) {
	err := errors.NewStreamAlreadyActiveError("cam-123")
	assert.Equal(t, "STREAM_ALREADY_ACTIVE", err.Code)
	assert.Contains(t, err.Error(), "cam-123")
}

func TestStreamNotFoundError(t *testing.T) {
	err := errors.NewStreamNotFoundError("cam-123")
	assert.Equal(t, "STREAM_NOT_FOUND", err.Code)
	assert.Contains(t, err.Error(), "cam-123")
}

func TestUnauthorizedError(t *testing.T) {
	err := errors.NewUnauthorizedError("bad token")
	assert.Equal(t, "UNAUTHORIZED", err.Code)
	assert.Equal(t, "bad token", err.Message)
}

func TestForbiddenError(t *testing.T) {
	err := errors.NewForbiddenError("not allowed")
	assert.Equal(t, "FORBIDDEN", err.Code)
}

func TestStreamConnectionError(t *testing.T) {
	err := errors.NewStreamConnectionError("cam-1", "timeout")
	assert.Equal(t, "STREAM_CONNECTION_ERROR", err.Code)
}

func TestIngestFailedError(t *testing.T) {
	err := errors.NewIngestFailedError("cam-1", "ffmpeg crashed")
	assert.Equal(t, "INGEST_FAILED", err.Code)
}

func TestValidationError(t *testing.T) {
	err := errors.NewValidationError("missing field")
	assert.Equal(t, "VALIDATION_ERROR", err.Code)
}
