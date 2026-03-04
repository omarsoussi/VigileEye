package persistence

import (
	"sync"

	"github.com/vigileye/streaming-backend/internal/domain/entities"
	"github.com/vigileye/streaming-backend/internal/domain/repositories"
)

// Compile-time interface check
var _ repositories.ViewerSessionRepository = (*InMemoryViewerSessionRepo)(nil)

// InMemoryViewerSessionRepo stores viewer sessions in memory.
type InMemoryViewerSessionRepo struct {
	mu      sync.RWMutex
	viewers map[string]*entities.ViewerSession
}

// NewInMemoryViewerSessionRepo creates a new in-memory viewer session repository.
func NewInMemoryViewerSessionRepo() *InMemoryViewerSessionRepo {
	return &InMemoryViewerSessionRepo{
		viewers: make(map[string]*entities.ViewerSession),
	}
}

func (r *InMemoryViewerSessionRepo) Get(viewerID string) (*entities.ViewerSession, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	v, ok := r.viewers[viewerID]
	return v, ok
}

func (r *InMemoryViewerSessionRepo) GetByCamera(cameraID string) []*entities.ViewerSession {
	r.mu.RLock()
	defer r.mu.RUnlock()
	var result []*entities.ViewerSession
	for _, v := range r.viewers {
		if v.CameraID == cameraID {
			result = append(result, v)
		}
	}
	return result
}

func (r *InMemoryViewerSessionRepo) GetByUser(userID string) []*entities.ViewerSession {
	r.mu.RLock()
	defer r.mu.RUnlock()
	var result []*entities.ViewerSession
	for _, v := range r.viewers {
		if v.UserID == userID {
			result = append(result, v)
		}
	}
	return result
}

func (r *InMemoryViewerSessionRepo) Save(session *entities.ViewerSession) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.viewers[session.ID] = session
}

func (r *InMemoryViewerSessionRepo) Remove(viewerID string) {
	r.mu.Lock()
	defer r.mu.Unlock()
	delete(r.viewers, viewerID)
}

func (r *InMemoryViewerSessionRepo) RemoveByCamera(cameraID string) {
	r.mu.Lock()
	defer r.mu.Unlock()
	for id, v := range r.viewers {
		if v.CameraID == cameraID {
			delete(r.viewers, id)
		}
	}
}
