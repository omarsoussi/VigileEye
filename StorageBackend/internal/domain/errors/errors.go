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

// NotFoundError is raised when a resource cannot be found.
type NotFoundError struct{ DomainError }

func NewNotFoundError(resource, id string) *NotFoundError {
	return &NotFoundError{DomainError{
		Message: fmt.Sprintf("%s %s not found", resource, id),
		Code:    "NOT_FOUND",
	}}
}

// RecordingNotFoundError is raised when a recording cannot be found.
type RecordingNotFoundError struct{ DomainError }

func NewRecordingNotFoundError(id string) *RecordingNotFoundError {
	return &RecordingNotFoundError{DomainError{
		Message: fmt.Sprintf("Recording %s not found", id),
		Code:    "RECORDING_NOT_FOUND",
	}}
}

// CameraNotFoundError is raised when a camera cannot be found.
type CameraNotFoundError struct{ DomainError }

func NewCameraNotFoundError(cameraID string) *CameraNotFoundError {
	return &CameraNotFoundError{DomainError{
		Message: fmt.Sprintf("Camera %s not found", cameraID),
		Code:    "CAMERA_NOT_FOUND",
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
		msg = "Access denied"
	}
	return &ForbiddenError{DomainError{Message: msg, Code: "FORBIDDEN"}}
}

// StorageQuotaExceededError is raised when storage quota is exceeded.
type StorageQuotaExceededError struct{ DomainError }

func NewStorageQuotaExceededError(cameraID string) *StorageQuotaExceededError {
	return &StorageQuotaExceededError{DomainError{
		Message: fmt.Sprintf("Storage quota exceeded for camera %s", cameraID),
		Code:    "QUOTA_EXCEEDED",
	}}
}

// SubscriptionRequiredError is raised when a feature requires PRO subscription.
type SubscriptionRequiredError struct{ DomainError }

func NewSubscriptionRequiredError(feature string) *SubscriptionRequiredError {
	return &SubscriptionRequiredError{DomainError{
		Message: fmt.Sprintf("PRO subscription required for %s", feature),
		Code:    "SUBSCRIPTION_REQUIRED",
	}}
}

// RecordingActiveError is raised when a camera is already being recorded.
type RecordingActiveError struct{ DomainError }

func NewRecordingActiveError(cameraID string) *RecordingActiveError {
	return &RecordingActiveError{DomainError{
		Message: fmt.Sprintf("Recording already active for camera %s", cameraID),
		Code:    "RECORDING_ACTIVE",
	}}
}

// StorageBackendError is raised when a storage backend operation fails.
type StorageBackendError struct{ DomainError }

func NewStorageBackendError(op, reason string) *StorageBackendError {
	return &StorageBackendError{DomainError{
		Message: fmt.Sprintf("Storage backend error during %s: %s", op, reason),
		Code:    "STORAGE_BACKEND_ERROR",
	}}
}
