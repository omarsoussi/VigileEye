package persistence

import (
	"sync"

	"github.com/vigileye/streaming-backend/internal/domain/entities"
	"github.com/vigileye/streaming-backend/internal/domain/repositories"
)

// Compile-time interface check
var _ repositories.StreamSessionRepository = (*InMemoryStreamSessionRepo)(nil)

// InMemoryStreamSessionRepo stores stream sessions in memory (ephemeral state).
type InMemoryStreamSessionRepo struct {
	mu       sync.RWMutex
	sessions map[string]*entities.StreamSession
}

// NewInMemoryStreamSessionRepo creates a new in-memory stream session repository.
func NewInMemoryStreamSessionRepo() *InMemoryStreamSessionRepo {
	return &InMemoryStreamSessionRepo{
		sessions: make(map[string]*entities.StreamSession),
	}
}

func (r *InMemoryStreamSessionRepo) Get(cameraID string) (*entities.StreamSession, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	s, ok := r.sessions[cameraID]
	return s, ok
}

func (r *InMemoryStreamSessionRepo) GetAll() []*entities.StreamSession {
	r.mu.RLock()
	defer r.mu.RUnlock()
	result := make([]*entities.StreamSession, 0, len(r.sessions))
	for _, s := range r.sessions {
		result = append(result, s)
	}
	return result
}

func (r *InMemoryStreamSessionRepo) Save(session *entities.StreamSession) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.sessions[session.CameraID] = session
}

func (r *InMemoryStreamSessionRepo) Remove(cameraID string) {
	r.mu.Lock()
	defer r.mu.Unlock()
	delete(r.sessions, cameraID)
}
