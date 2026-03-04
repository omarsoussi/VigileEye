package errors

import "fmt"

// DomainError is the base error type for domain-level errors.
type DomainError struct {
	Message string
	Code    string
}

func (e *DomainError) Error() string {
	return e.Message
}

// CameraNotFoundError is raised when a camera cannot be found.
type CameraNotFoundError struct{ DomainError }

func NewCameraNotFoundError(cameraID string) *CameraNotFoundError {
	return &CameraNotFoundError{DomainError{
		Message: fmt.Sprintf("Camera %s not found", cameraID),
		Code:    "CAMERA_NOT_FOUND",
	}}
}

// StreamAlreadyActiveError is raised when trying to start an already active stream.
type StreamAlreadyActiveError struct{ DomainError }

func NewStreamAlreadyActiveError(cameraID string) *StreamAlreadyActiveError {
	return &StreamAlreadyActiveError{DomainError{
		Message: fmt.Sprintf("Stream already active for camera %s", cameraID),
		Code:    "STREAM_ALREADY_ACTIVE",
	}}
}

// StreamNotFoundError is raised when no stream exists for a camera.
type StreamNotFoundError struct{ DomainError }

func NewStreamNotFoundError(cameraID string) *StreamNotFoundError {
	return &StreamNotFoundError{DomainError{
		Message: fmt.Sprintf("No active stream for camera %s", cameraID),
		Code:    "STREAM_NOT_FOUND",
	}}
}

// UnauthorizedError is raised for authentication failures.
type UnauthorizedError struct{ DomainError }

func NewUnauthorizedError(msg string) *UnauthorizedError {
	if msg == "" {
		msg = "Unauthorized"
	}
	return &UnauthorizedError{DomainError{Message: msg, Code: "UNAUTHORIZED"}}
}

// ForbiddenError is raised for authorization failures.
type ForbiddenError struct{ DomainError }

func NewForbiddenError(msg string) *ForbiddenError {
	if msg == "" {
		msg = "Access denied to this camera"
	}
	return &ForbiddenError{DomainError{Message: msg, Code: "FORBIDDEN"}}
}

// StreamConnectionError is raised when stream connection fails.
type StreamConnectionError struct{ DomainError }

func NewStreamConnectionError(cameraID, reason string) *StreamConnectionError {
	return &StreamConnectionError{DomainError{
		Message: fmt.Sprintf("Failed to connect stream for camera %s: %s", cameraID, reason),
		Code:    "STREAM_CONNECTION_ERROR",
	}}
}

// IngestFailedError is raised when camera ingest fails.
type IngestFailedError struct{ DomainError }

func NewIngestFailedError(cameraID, reason string) *IngestFailedError {
	return &IngestFailedError{DomainError{
		Message: fmt.Sprintf("Failed to ingest camera %s: %s", cameraID, reason),
		Code:    "INGEST_FAILED",
	}}
}

// ValidationError is raised for input validation failures.
type ValidationError struct{ DomainError }

func NewValidationError(msg string) *ValidationError {
	return &ValidationError{DomainError{Message: msg, Code: "VALIDATION_ERROR"}}
}
