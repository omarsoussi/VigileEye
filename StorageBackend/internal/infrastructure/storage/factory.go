package storage

import (
	"fmt"

	"github.com/rs/zerolog/log"
	"github.com/vigileye/storage-backend/internal/domain/services"
	"github.com/vigileye/storage-backend/internal/infrastructure/config"
)

// NewStorageBackend is a factory that creates the appropriate storage backend
// based on the STORAGE_MODE environment variable (Strategy Pattern).
func NewStorageBackend(cfg *config.Config) (services.StorageBackend, error) {
	switch cfg.StorageMode {
	case "local":
		log.Info().Str("path", cfg.LocalStoragePath).Msg("Using local filesystem storage")
		return NewLocalFSBackend(cfg.LocalStoragePath), nil

	case "minio":
		log.Info().Str("endpoint", cfg.MinIOEndpoint).Str("bucket", cfg.MinIOBucket).Msg("Using MinIO storage")
		return NewMinIOBackend(cfg)

	case "azure":
		log.Info().Str("container", cfg.AzureContainerName).Msg("Using Azure Blob storage")
		return NewAzureBlobBackend(cfg)

	default:
		return nil, fmt.Errorf("unsupported storage mode: %s (valid: local, minio, azure)", cfg.StorageMode)
	}
}
