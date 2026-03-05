package repositories

import (
	"context"

	"github.com/vigileye/storage-backend/internal/domain/entities"
)

// RecordingRepository defines the persistence contract for recordings.
type RecordingRepository interface {
	Create(ctx context.Context, recording *entities.Recording) error
	GetByID(ctx context.Context, id string) (*entities.Recording, error)
	Update(ctx context.Context, recording *entities.Recording) error
	Delete(ctx context.Context, id string) error
	ListByCamera(ctx context.Context, cameraID string, limit, offset int) ([]*entities.Recording, error)
	ListByUser(ctx context.Context, userID string, limit, offset int) ([]*entities.Recording, error)
	GetActiveByCamera(ctx context.Context, cameraID string) (*entities.Recording, error)
	CountByCamera(ctx context.Context, cameraID string) (int, error)
	GetTotalSizeByCamera(ctx context.Context, cameraID string) (int64, error)
	GetTotalSizeByUser(ctx context.Context, userID string) (int64, error)
	DeleteOlderThan(ctx context.Context, cameraID string, beforeUnix int64) (int, error)
	GetOldestByCamera(ctx context.Context, cameraID string) (*entities.Recording, error)
}

// StorageConfigRepository defines the persistence contract for camera storage configs.
type StorageConfigRepository interface {
	Create(ctx context.Context, config *entities.CameraStorageConfig) error
	GetByID(ctx context.Context, id string) (*entities.CameraStorageConfig, error)
	GetByCamera(ctx context.Context, cameraID string) (*entities.CameraStorageConfig, error)
	Update(ctx context.Context, config *entities.CameraStorageConfig) error
	Delete(ctx context.Context, id string) error
	ListByUser(ctx context.Context, userID string) ([]*entities.CameraStorageConfig, error)
	ListEnabled(ctx context.Context) ([]*entities.CameraStorageConfig, error)
}
