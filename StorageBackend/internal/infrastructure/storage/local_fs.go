package storage

import (
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"

	"github.com/rs/zerolog/log"
)

// LocalFSBackend implements StorageBackend using the local filesystem.
type LocalFSBackend struct {
	basePath string
}

// NewLocalFSBackend creates a new local filesystem storage backend.
func NewLocalFSBackend(basePath string) *LocalFSBackend {
	// Ensure base path exists
	if err := os.MkdirAll(basePath, 0755); err != nil {
		log.Fatal().Err(err).Str("path", basePath).Msg("Failed to create local storage directory")
	}
	return &LocalFSBackend{basePath: basePath}
}

// Mode returns the storage mode identifier.
func (l *LocalFSBackend) Mode() string { return "local" }

// Upload stores a file on the local filesystem.
func (l *LocalFSBackend) Upload(ctx context.Context, key string, reader io.Reader, size int64, contentType string) (string, error) {
	fullPath := filepath.Join(l.basePath, key)

	// Create directory structure
	dir := filepath.Dir(fullPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return "", fmt.Errorf("failed to create directory %s: %w", dir, err)
	}

	file, err := os.Create(fullPath)
	if err != nil {
		return "", fmt.Errorf("failed to create file %s: %w", fullPath, err)
	}
	defer file.Close()

	written, err := io.Copy(file, reader)
	if err != nil {
		return "", fmt.Errorf("failed to write file: %w", err)
	}

	log.Debug().Str("path", fullPath).Int64("bytes", written).Msg("Local file uploaded")
	return fullPath, nil
}

// Download returns a ReadCloser for a stored file.
func (l *LocalFSBackend) Download(ctx context.Context, key string) (io.ReadCloser, error) {
	fullPath := filepath.Join(l.basePath, key)
	file, err := os.Open(fullPath)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, fmt.Errorf("file not found: %s", key)
		}
		return nil, fmt.Errorf("failed to open file: %w", err)
	}
	return file, nil
}

// Delete removes a file from the local filesystem.
func (l *LocalFSBackend) Delete(ctx context.Context, key string) error {
	fullPath := filepath.Join(l.basePath, key)
	if err := os.Remove(fullPath); err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("failed to delete file %s: %w", fullPath, err)
	}
	// Also try to remove the thumbnail
	thumbPath := strings.TrimSuffix(fullPath, filepath.Ext(fullPath)) + "_thumb.jpg"
	_ = os.Remove(thumbPath)
	log.Debug().Str("path", fullPath).Msg("Local file deleted")
	return nil
}

// GetSize returns the size of a stored file.
func (l *LocalFSBackend) GetSize(ctx context.Context, key string) (int64, error) {
	fullPath := filepath.Join(l.basePath, key)
	info, err := os.Stat(fullPath)
	if err != nil {
		return 0, fmt.Errorf("failed to stat file %s: %w", fullPath, err)
	}
	return info.Size(), nil
}

// Exists checks if a file exists on the local filesystem.
func (l *LocalFSBackend) Exists(ctx context.Context, key string) (bool, error) {
	fullPath := filepath.Join(l.basePath, key)
	_, err := os.Stat(fullPath)
	if err != nil {
		if os.IsNotExist(err) {
			return false, nil
		}
		return false, err
	}
	return true, nil
}

// GetSignedURL returns the local file path (no real signing for local).
func (l *LocalFSBackend) GetSignedURL(ctx context.Context, key string, durationSecs int) (string, error) {
	// For local storage, return the API download endpoint path
	return fmt.Sprintf("/api/v1/storage/download/%s", key), nil
}

// StreamRange returns a reader for a byte range.
func (l *LocalFSBackend) StreamRange(ctx context.Context, key string, start, end int64) (io.ReadCloser, error) {
	fullPath := filepath.Join(l.basePath, key)
	file, err := os.Open(fullPath)
	if err != nil {
		return nil, fmt.Errorf("failed to open file: %w", err)
	}

	if _, err := file.Seek(start, io.SeekStart); err != nil {
		file.Close()
		return nil, fmt.Errorf("failed to seek to position %d: %w", start, err)
	}

	if end > 0 {
		return &limitedReadCloser{
			Reader: io.LimitReader(file, end-start+1),
			Closer: file,
		}, nil
	}
	return file, nil
}

type limitedReadCloser struct {
	io.Reader
	Closer io.Closer
}

func (l *limitedReadCloser) Close() error {
	return l.Closer.Close()
}
