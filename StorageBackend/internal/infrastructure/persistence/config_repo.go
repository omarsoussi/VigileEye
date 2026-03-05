package persistence

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/vigileye/storage-backend/internal/domain/entities"
)

// InMemoryStorageConfigRepo is an in-memory implementation of StorageConfigRepository.
type InMemoryStorageConfigRepo struct {
	mu      sync.RWMutex
	configs map[string]*entities.CameraStorageConfig // keyed by ID
}

// NewInMemoryStorageConfigRepo creates a new in-memory config repository.
func NewInMemoryStorageConfigRepo() *InMemoryStorageConfigRepo {
	return &InMemoryStorageConfigRepo{
		configs: make(map[string]*entities.CameraStorageConfig),
	}
}

func (r *InMemoryStorageConfigRepo) Create(ctx context.Context, config *entities.CameraStorageConfig) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.configs[config.ID] = config
	return nil
}

func (r *InMemoryStorageConfigRepo) GetByID(ctx context.Context, id string) (*entities.CameraStorageConfig, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	config, ok := r.configs[id]
	if !ok {
		return nil, fmt.Errorf("config %s not found", id)
	}
	return config, nil
}

func (r *InMemoryStorageConfigRepo) GetByCamera(ctx context.Context, cameraID string) (*entities.CameraStorageConfig, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	for _, config := range r.configs {
		if config.CameraID == cameraID {
			return config, nil
		}
	}
	return nil, nil
}

func (r *InMemoryStorageConfigRepo) Update(ctx context.Context, config *entities.CameraStorageConfig) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	config.UpdatedAt = time.Now().UTC()
	r.configs[config.ID] = config
	return nil
}

func (r *InMemoryStorageConfigRepo) Delete(ctx context.Context, id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	delete(r.configs, id)
	return nil
}

func (r *InMemoryStorageConfigRepo) ListByUser(ctx context.Context, userID string) ([]*entities.CameraStorageConfig, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	var result []*entities.CameraStorageConfig
	for _, config := range r.configs {
		if config.OwnerUserID == userID {
			result = append(result, config)
		}
	}
	return result, nil
}

func (r *InMemoryStorageConfigRepo) ListEnabled(ctx context.Context) ([]*entities.CameraStorageConfig, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	var result []*entities.CameraStorageConfig
	for _, config := range r.configs {
		if config.Enabled {
			result = append(result, config)
		}
	}
	return result, nil
}
