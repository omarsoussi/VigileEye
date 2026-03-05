package storage

import (
	"context"
	"fmt"
	"io"

	"github.com/rs/zerolog/log"
	"github.com/vigileye/storage-backend/internal/infrastructure/config"
)

// AzureBlobBackend implements StorageBackend using Azure Blob Storage.
// NOTE: This is a placeholder that can be fully implemented when Azure SDK
// credentials are available. For now it wraps the interface with stubs.
type AzureBlobBackend struct {
	connectionString string
	containerName    string
}

// NewAzureBlobBackend creates a new Azure Blob storage backend.
func NewAzureBlobBackend(cfg *config.Config) (*AzureBlobBackend, error) {
	if cfg.AzureConnectionString == "" {
		return nil, fmt.Errorf("AZURE_STORAGE_CONNECTION_STRING is required for azure mode")
	}

	log.Info().Str("container", cfg.AzureContainerName).Msg("Azure Blob backend initialized")
	return &AzureBlobBackend{
		connectionString: cfg.AzureConnectionString,
		containerName:    cfg.AzureContainerName,
	}, nil
}

// Mode returns the storage mode identifier.
func (a *AzureBlobBackend) Mode() string { return "azure" }

// Upload stores a file in Azure Blob Storage.
func (a *AzureBlobBackend) Upload(ctx context.Context, key string, reader io.Reader, size int64, contentType string) (string, error) {
	// TODO: Implement with azblob SDK when credentials are available
	// client, _ := azblob.NewClientFromConnectionString(a.connectionString, nil)
	// _, err := client.UploadStream(ctx, a.containerName, key, reader, &azblob.UploadStreamOptions{})
	return fmt.Sprintf("azure://%s/%s", a.containerName, key), fmt.Errorf("azure upload not yet implemented")
}

// Download returns a ReadCloser for a stored file.
func (a *AzureBlobBackend) Download(ctx context.Context, key string) (io.ReadCloser, error) {
	return nil, fmt.Errorf("azure download not yet implemented")
}

// Delete removes a file from Azure Blob Storage.
func (a *AzureBlobBackend) Delete(ctx context.Context, key string) error {
	return fmt.Errorf("azure delete not yet implemented")
}

// GetSize returns the size of a stored file.
func (a *AzureBlobBackend) GetSize(ctx context.Context, key string) (int64, error) {
	return 0, fmt.Errorf("azure get size not yet implemented")
}

// Exists checks if a file exists in Azure Blob Storage.
func (a *AzureBlobBackend) Exists(ctx context.Context, key string) (bool, error) {
	return false, fmt.Errorf("azure exists not yet implemented")
}

// GetSignedURL generates a SAS URL for time-limited download.
func (a *AzureBlobBackend) GetSignedURL(ctx context.Context, key string, durationSecs int) (string, error) {
	return "", fmt.Errorf("azure signed URL not yet implemented")
}

// StreamRange returns a reader for a byte range.
func (a *AzureBlobBackend) StreamRange(ctx context.Context, key string, start, end int64) (io.ReadCloser, error) {
	return nil, fmt.Errorf("azure stream range not yet implemented")
}
