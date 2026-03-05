package unit

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/vigileye/storage-backend/internal/domain/errors"
)

func TestNotFoundError(t *testing.T) {
	err := errors.NewNotFoundError("Recording", "123")
	assert.Equal(t, "Recording 123 not found", err.Error())
	assert.Equal(t, "NOT_FOUND", err.Code)
}

func TestRecordingNotFoundError(t *testing.T) {
	err := errors.NewRecordingNotFoundError("rec-1")
	assert.Equal(t, "Recording rec-1 not found", err.Error())
	assert.Equal(t, "RECORDING_NOT_FOUND", err.Code)
}

func TestUnauthorizedError(t *testing.T) {
	err := errors.NewUnauthorizedError("")
	assert.Equal(t, "Unauthorized", err.Error())

	err = errors.NewUnauthorizedError("Invalid token")
	assert.Equal(t, "Invalid token", err.Error())
}

func TestForbiddenError(t *testing.T) {
	err := errors.NewForbiddenError("")
	assert.Equal(t, "Access denied", err.Error())
}

func TestStorageQuotaExceededError(t *testing.T) {
	err := errors.NewStorageQuotaExceededError("cam-1")
	assert.Contains(t, err.Error(), "cam-1")
	assert.Equal(t, "QUOTA_EXCEEDED", err.Code)
}

func TestSubscriptionRequiredError(t *testing.T) {
	err := errors.NewSubscriptionRequiredError("azure storage")
	assert.Contains(t, err.Error(), "azure storage")
	assert.Equal(t, "SUBSCRIPTION_REQUIRED", err.Code)
}

func TestRecordingActiveError(t *testing.T) {
	err := errors.NewRecordingActiveError("cam-1")
	assert.Contains(t, err.Error(), "cam-1")
	assert.Equal(t, "RECORDING_ACTIVE", err.Code)
}

func TestStorageBackendError(t *testing.T) {
	err := errors.NewStorageBackendError("upload", "disk full")
	assert.Contains(t, err.Error(), "upload")
	assert.Contains(t, err.Error(), "disk full")
}
