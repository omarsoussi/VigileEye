package persistence

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/vigileye/storage-backend/internal/domain/entities"
)

// InMemoryRecordingRepo is an in-memory implementation of RecordingRepository.
// Used when PostgreSQL is not available or for testing.
type InMemoryRecordingRepo struct {
	mu         sync.RWMutex
	recordings map[string]*entities.Recording
}

// NewInMemoryRecordingRepo creates a new in-memory recording repository.
func NewInMemoryRecordingRepo() *InMemoryRecordingRepo {
	return &InMemoryRecordingRepo{
		recordings: make(map[string]*entities.Recording),
	}
}

func (r *InMemoryRecordingRepo) Create(ctx context.Context, rec *entities.Recording) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.recordings[rec.ID] = rec
	return nil
}

func (r *InMemoryRecordingRepo) GetByID(ctx context.Context, id string) (*entities.Recording, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	rec, ok := r.recordings[id]
	if !ok {
		return nil, fmt.Errorf("recording %s not found", id)
	}
	return rec, nil
}

func (r *InMemoryRecordingRepo) Update(ctx context.Context, rec *entities.Recording) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.recordings[rec.ID] = rec
	return nil
}

func (r *InMemoryRecordingRepo) Delete(ctx context.Context, id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	delete(r.recordings, id)
	return nil
}

func (r *InMemoryRecordingRepo) ListByCamera(ctx context.Context, cameraID string, limit, offset int) ([]*entities.Recording, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	var result []*entities.Recording
	for _, rec := range r.recordings {
		if rec.CameraID == cameraID && rec.Status != entities.RecordingStatusDeleted {
			result = append(result, rec)
		}
	}
	// Apply pagination
	if offset >= len(result) {
		return nil, nil
	}
	end := offset + limit
	if end > len(result) {
		end = len(result)
	}
	return result[offset:end], nil
}

func (r *InMemoryRecordingRepo) ListByUser(ctx context.Context, userID string, limit, offset int) ([]*entities.Recording, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	var result []*entities.Recording
	for _, rec := range r.recordings {
		if rec.OwnerUserID == userID && rec.Status != entities.RecordingStatusDeleted {
			result = append(result, rec)
		}
	}
	if offset >= len(result) {
		return nil, nil
	}
	end := offset + limit
	if end > len(result) {
		end = len(result)
	}
	return result[offset:end], nil
}

func (r *InMemoryRecordingRepo) GetActiveByCamera(ctx context.Context, cameraID string) (*entities.Recording, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	for _, rec := range r.recordings {
		if rec.CameraID == cameraID && rec.Status == entities.RecordingStatusRecording {
			return rec, nil
		}
	}
	return nil, nil
}

func (r *InMemoryRecordingRepo) CountByCamera(ctx context.Context, cameraID string) (int, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	count := 0
	for _, rec := range r.recordings {
		if rec.CameraID == cameraID && rec.Status != entities.RecordingStatusDeleted {
			count++
		}
	}
	return count, nil
}

func (r *InMemoryRecordingRepo) GetTotalSizeByCamera(ctx context.Context, cameraID string) (int64, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	var total int64
	for _, rec := range r.recordings {
		if rec.CameraID == cameraID && rec.Status == entities.RecordingStatusCompleted {
			total += rec.FileSize
		}
	}
	return total, nil
}

func (r *InMemoryRecordingRepo) GetTotalSizeByUser(ctx context.Context, userID string) (int64, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	var total int64
	for _, rec := range r.recordings {
		if rec.OwnerUserID == userID && rec.Status == entities.RecordingStatusCompleted {
			total += rec.FileSize
		}
	}
	return total, nil
}

func (r *InMemoryRecordingRepo) DeleteOlderThan(ctx context.Context, cameraID string, beforeUnix int64) (int, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	cutoff := time.Unix(beforeUnix, 0)
	deleted := 0
	for id, rec := range r.recordings {
		if rec.CameraID == cameraID && rec.CreatedAt.Before(cutoff) && rec.Status != entities.RecordingStatusDeleted {
			r.recordings[id].Status = entities.RecordingStatusDeleted
			deleted++
		}
	}
	return deleted, nil
}

func (r *InMemoryRecordingRepo) GetOldestByCamera(ctx context.Context, cameraID string) (*entities.Recording, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	var oldest *entities.Recording
	for _, rec := range r.recordings {
		if rec.CameraID == cameraID && rec.Status == entities.RecordingStatusCompleted {
			if oldest == nil || rec.CreatedAt.Before(oldest.CreatedAt) {
				oldest = rec
			}
		}
	}
	return oldest, nil
}
