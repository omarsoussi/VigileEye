package unit

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/vigileye/streaming-backend/internal/domain/entities"
	"github.com/vigileye/streaming-backend/internal/infrastructure/persistence"
)

func TestInMemoryStreamSessionRepo_SaveAndGet(t *testing.T) {
	repo := persistence.NewInMemoryStreamSessionRepo()
	session := entities.NewStreamSession("s1", "cam-1", "user-1", "rtsp://test", entities.DefaultStreamConfig)

	repo.Save(session)

	got, ok := repo.Get("cam-1")
	require.True(t, ok)
	assert.Equal(t, "s1", got.ID)
	assert.Equal(t, "cam-1", got.CameraID)
}

func TestInMemoryStreamSessionRepo_GetAll(t *testing.T) {
	repo := persistence.NewInMemoryStreamSessionRepo()

	repo.Save(entities.NewStreamSession("s1", "cam-1", "user-1", "rtsp://1", entities.DefaultStreamConfig))
	repo.Save(entities.NewStreamSession("s2", "cam-2", "user-1", "rtsp://2", entities.DefaultStreamConfig))

	all := repo.GetAll()
	assert.Len(t, all, 2)
}

func TestInMemoryStreamSessionRepo_Remove(t *testing.T) {
	repo := persistence.NewInMemoryStreamSessionRepo()
	session := entities.NewStreamSession("s1", "cam-1", "user-1", "rtsp://test", entities.DefaultStreamConfig)
	repo.Save(session)

	repo.Remove("cam-1")

	_, ok := repo.Get("cam-1")
	assert.False(t, ok)
}

func TestInMemoryStreamSessionRepo_GetNonExistent(t *testing.T) {
	repo := persistence.NewInMemoryStreamSessionRepo()

	_, ok := repo.Get("nonexistent")
	assert.False(t, ok)
}

func TestInMemoryViewerSessionRepo_SaveAndGet(t *testing.T) {
	repo := persistence.NewInMemoryViewerSessionRepo()
	viewer := entities.NewViewerSession("v1", "cam-1", "user-1", "test-uuid")

	repo.Save(viewer)

	got, ok := repo.Get("v1")
	require.True(t, ok)
	assert.Equal(t, "v1", got.ID)
}

func TestInMemoryViewerSessionRepo_GetByCamera(t *testing.T) {
	repo := persistence.NewInMemoryViewerSessionRepo()
	repo.Save(entities.NewViewerSession("v1", "cam-1", "user-1", "uuid-1"))
	repo.Save(entities.NewViewerSession("v2", "cam-1", "user-2", "uuid-2"))
	repo.Save(entities.NewViewerSession("v3", "cam-2", "user-1", "uuid-3"))

	viewers := repo.GetByCamera("cam-1")
	assert.Len(t, viewers, 2)
}

func TestInMemoryViewerSessionRepo_GetByUser(t *testing.T) {
	repo := persistence.NewInMemoryViewerSessionRepo()
	repo.Save(entities.NewViewerSession("v1", "cam-1", "user-1", "uuid-1"))
	repo.Save(entities.NewViewerSession("v2", "cam-2", "user-1", "uuid-2"))
	repo.Save(entities.NewViewerSession("v3", "cam-1", "user-2", "uuid-3"))

	viewers := repo.GetByUser("user-1")
	assert.Len(t, viewers, 2)
}

func TestInMemoryViewerSessionRepo_Remove(t *testing.T) {
	repo := persistence.NewInMemoryViewerSessionRepo()
	viewer := entities.NewViewerSession("v1", "cam-1", "user-1", "test-uuid")
	repo.Save(viewer)

	repo.Remove("v1")

	_, ok := repo.Get("v1")
	assert.False(t, ok)
}

func TestInMemoryViewerSessionRepo_RemoveByCamera(t *testing.T) {
	repo := persistence.NewInMemoryViewerSessionRepo()
	repo.Save(entities.NewViewerSession("v1", "cam-1", "user-1", "uuid-1"))
	repo.Save(entities.NewViewerSession("v2", "cam-1", "user-2", "uuid-2"))
	repo.Save(entities.NewViewerSession("v3", "cam-2", "user-1", "uuid-3"))

	repo.RemoveByCamera("cam-1")

	viewers := repo.GetByCamera("cam-1")
	assert.Empty(t, viewers)

	// cam-2 viewer should still exist
	viewers2 := repo.GetByCamera("cam-2")
	assert.Len(t, viewers2, 1)
}
