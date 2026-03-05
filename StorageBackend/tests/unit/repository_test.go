package unit

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/vigileye/storage-backend/internal/domain/entities"
	"github.com/vigileye/storage-backend/internal/infrastructure/persistence"
)

func TestInMemoryRecordingRepo_CRUD(t *testing.T) {
	repo := persistence.NewInMemoryRecordingRepo()
	ctx := context.Background()

	rec := entities.NewRecording("cam-1", "user-1", "local")
	rec.FileName = "test.mp4"
	rec.FilePath = "cam-1/2026-03-05/test.mp4"

	// Create
	err := repo.Create(ctx, rec)
	require.NoError(t, err)

	// GetByID
	found, err := repo.GetByID(ctx, rec.ID)
	require.NoError(t, err)
	assert.Equal(t, rec.CameraID, found.CameraID)

	// Update
	rec.Complete(1024, 60)
	err = repo.Update(ctx, rec)
	require.NoError(t, err)
	found, _ = repo.GetByID(ctx, rec.ID)
	assert.Equal(t, entities.RecordingStatusCompleted, found.Status)

	// ListByCamera
	recs, err := repo.ListByCamera(ctx, "cam-1", 10, 0)
	require.NoError(t, err)
	assert.Len(t, recs, 1)

	// ListByUser
	recs, err = repo.ListByUser(ctx, "user-1", 10, 0)
	require.NoError(t, err)
	assert.Len(t, recs, 1)

	// CountByCamera
	count, err := repo.CountByCamera(ctx, "cam-1")
	require.NoError(t, err)
	assert.Equal(t, 1, count)

	// TotalSize
	size, err := repo.GetTotalSizeByCamera(ctx, "cam-1")
	require.NoError(t, err)
	assert.Equal(t, int64(1024), size)

	// Delete
	err = repo.Delete(ctx, rec.ID)
	require.NoError(t, err)
	_, err = repo.GetByID(ctx, rec.ID)
	assert.Error(t, err)
}

func TestInMemoryStorageConfigRepo_CRUD(t *testing.T) {
	repo := persistence.NewInMemoryStorageConfigRepo()
	ctx := context.Background()

	cfg := entities.NewCameraStorageConfig("cam-1", "user-1")

	// Create
	err := repo.Create(ctx, cfg)
	require.NoError(t, err)

	// GetByCamera
	found, err := repo.GetByCamera(ctx, "cam-1")
	require.NoError(t, err)
	assert.Equal(t, cfg.ID, found.ID)

	// Update
	cfg.Enabled = true
	err = repo.Update(ctx, cfg)
	require.NoError(t, err)
	found, _ = repo.GetByCamera(ctx, "cam-1")
	assert.True(t, found.Enabled)

	// ListByUser
	configs, err := repo.ListByUser(ctx, "user-1")
	require.NoError(t, err)
	assert.Len(t, configs, 1)

	// ListEnabled
	configs, err = repo.ListEnabled(ctx)
	require.NoError(t, err)
	assert.Len(t, configs, 1)

	// Delete
	err = repo.Delete(ctx, cfg.ID)
	require.NoError(t, err)
	found, _ = repo.GetByCamera(ctx, "cam-1")
	assert.Nil(t, found)
}

func TestInMemoryRecordingRepo_GetActiveByCamera(t *testing.T) {
	repo := persistence.NewInMemoryRecordingRepo()
	ctx := context.Background()

	rec := entities.NewRecording("cam-1", "user-1", "local")
	_ = repo.Create(ctx, rec)

	active, err := repo.GetActiveByCamera(ctx, "cam-1")
	require.NoError(t, err)
	assert.NotNil(t, active)
	assert.Equal(t, entities.RecordingStatusRecording, active.Status)

	// Complete recording
	rec.Complete(1024, 60)
	_ = repo.Update(ctx, rec)

	active, err = repo.GetActiveByCamera(ctx, "cam-1")
	require.NoError(t, err)
	assert.Nil(t, active)
}
