package unit

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/vigileye/storage-backend/internal/domain/entities"
)

func TestNewRecording(t *testing.T) {
	rec := entities.NewRecording("cam-1", "user-1", "local")

	assert.NotEmpty(t, rec.ID)
	assert.Equal(t, "cam-1", rec.CameraID)
	assert.Equal(t, "user-1", rec.OwnerUserID)
	assert.Equal(t, "local", rec.StorageMode)
	assert.Equal(t, entities.RecordingStatusRecording, rec.Status)
	assert.Equal(t, "mp4", rec.Format)
	assert.Equal(t, "h264", rec.Codec)
	assert.True(t, rec.IsActive())
}

func TestRecording_Complete(t *testing.T) {
	rec := entities.NewRecording("cam-1", "user-1", "local")
	require.True(t, rec.IsActive())

	rec.Complete(1024*1024*50, 600)

	assert.Equal(t, entities.RecordingStatusCompleted, rec.Status)
	assert.Equal(t, int64(1024*1024*50), rec.FileSize)
	assert.Equal(t, 600, rec.DurationSecs)
	assert.NotNil(t, rec.EndedAt)
	assert.False(t, rec.IsActive())
}

func TestRecording_MarkFailed(t *testing.T) {
	rec := entities.NewRecording("cam-1", "user-1", "local")
	rec.MarkFailed()

	assert.Equal(t, entities.RecordingStatusFailed, rec.Status)
	assert.False(t, rec.IsActive())
}

func TestRecording_MarkDeleted(t *testing.T) {
	rec := entities.NewRecording("cam-1", "user-1", "local")
	rec.Complete(1024, 60)
	rec.MarkDeleted()

	assert.Equal(t, entities.RecordingStatusDeleted, rec.Status)
}

func TestRecording_Timestamps(t *testing.T) {
	before := time.Now().UTC()
	rec := entities.NewRecording("cam-1", "user-1", "minio")
	after := time.Now().UTC()

	assert.True(t, !rec.CreatedAt.Before(before))
	assert.True(t, !rec.CreatedAt.After(after))
	assert.True(t, !rec.StartedAt.Before(before))
}
