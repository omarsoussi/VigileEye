package repositories

import "github.com/vigileye/streaming-backend/internal/domain/entities"

// StreamSessionRepository defines the persistence contract for stream sessions.
type StreamSessionRepository interface {
	Get(cameraID string) (*entities.StreamSession, bool)
	GetAll() []*entities.StreamSession
	Save(session *entities.StreamSession)
	Remove(cameraID string)
}

// ViewerSessionRepository defines the persistence contract for viewer sessions.
type ViewerSessionRepository interface {
	Get(viewerID string) (*entities.ViewerSession, bool)
	GetByCamera(cameraID string) []*entities.ViewerSession
	GetByUser(userID string) []*entities.ViewerSession
	Save(session *entities.ViewerSession)
	Remove(viewerID string)
	RemoveByCamera(cameraID string)
}
