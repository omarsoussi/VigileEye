package storage

import (
	"context"
	"fmt"
	"io"
	"net/url"
	"time"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
	"github.com/rs/zerolog/log"
	"github.com/vigileye/storage-backend/internal/infrastructure/config"
)

// MinIOBackend implements StorageBackend using MinIO (S3-compatible).
type MinIOBackend struct {
	client *minio.Client
	bucket string
}

// NewMinIOBackend creates a new MinIO storage backend.
func NewMinIOBackend(cfg *config.Config) (*MinIOBackend, error) {
	client, err := minio.New(cfg.MinIOEndpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(cfg.MinIOAccessKey, cfg.MinIOSecretKey, ""),
		Secure: cfg.MinIOUseSSL,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create MinIO client: %w", err)
	}

	// Ensure bucket exists
	ctx := context.Background()
	exists, err := client.BucketExists(ctx, cfg.MinIOBucket)
	if err != nil {
		return nil, fmt.Errorf("failed to check bucket: %w", err)
	}
	if !exists {
		if err := client.MakeBucket(ctx, cfg.MinIOBucket, minio.MakeBucketOptions{}); err != nil {
			return nil, fmt.Errorf("failed to create bucket %s: %w", cfg.MinIOBucket, err)
		}
		log.Info().Str("bucket", cfg.MinIOBucket).Msg("MinIO bucket created")
	}

	return &MinIOBackend{client: client, bucket: cfg.MinIOBucket}, nil
}

// Mode returns the storage mode identifier.
func (m *MinIOBackend) Mode() string { return "minio" }

// Upload stores a file in MinIO.
func (m *MinIOBackend) Upload(ctx context.Context, key string, reader io.Reader, size int64, contentType string) (string, error) {
	opts := minio.PutObjectOptions{ContentType: contentType}
	info, err := m.client.PutObject(ctx, m.bucket, key, reader, size, opts)
	if err != nil {
		return "", fmt.Errorf("minio upload failed: %w", err)
	}
	log.Debug().Str("key", key).Int64("bytes", info.Size).Msg("MinIO file uploaded")
	return fmt.Sprintf("minio://%s/%s", m.bucket, key), nil
}

// Download returns a ReadCloser for a stored file.
func (m *MinIOBackend) Download(ctx context.Context, key string) (io.ReadCloser, error) {
	obj, err := m.client.GetObject(ctx, m.bucket, key, minio.GetObjectOptions{})
	if err != nil {
		return nil, fmt.Errorf("minio download failed: %w", err)
	}
	return obj, nil
}

// Delete removes a file from MinIO.
func (m *MinIOBackend) Delete(ctx context.Context, key string) error {
	if err := m.client.RemoveObject(ctx, m.bucket, key, minio.RemoveObjectOptions{}); err != nil {
		return fmt.Errorf("minio delete failed: %w", err)
	}
	log.Debug().Str("key", key).Msg("MinIO file deleted")
	return nil
}

// GetSize returns the size of a stored file.
func (m *MinIOBackend) GetSize(ctx context.Context, key string) (int64, error) {
	info, err := m.client.StatObject(ctx, m.bucket, key, minio.StatObjectOptions{})
	if err != nil {
		return 0, fmt.Errorf("minio stat failed: %w", err)
	}
	return info.Size, nil
}

// Exists checks if a file exists in MinIO.
func (m *MinIOBackend) Exists(ctx context.Context, key string) (bool, error) {
	_, err := m.client.StatObject(ctx, m.bucket, key, minio.StatObjectOptions{})
	if err != nil {
		errResp := minio.ToErrorResponse(err)
		if errResp.Code == "NoSuchKey" {
			return false, nil
		}
		return false, err
	}
	return true, nil
}

// GetSignedURL generates a presigned download URL.
func (m *MinIOBackend) GetSignedURL(ctx context.Context, key string, durationSecs int) (string, error) {
	reqParams := make(url.Values)
	u, err := m.client.PresignedGetObject(ctx, m.bucket, key, time.Duration(durationSecs)*time.Second, reqParams)
	if err != nil {
		return "", fmt.Errorf("minio presign failed: %w", err)
	}
	return u.String(), nil
}

// StreamRange returns a reader for a byte range.
func (m *MinIOBackend) StreamRange(ctx context.Context, key string, start, end int64) (io.ReadCloser, error) {
	opts := minio.GetObjectOptions{}
	if err := opts.SetRange(start, end); err != nil {
		return nil, fmt.Errorf("failed to set range: %w", err)
	}
	obj, err := m.client.GetObject(ctx, m.bucket, key, opts)
	if err != nil {
		return nil, fmt.Errorf("minio range read failed: %w", err)
	}
	return obj, nil
}
