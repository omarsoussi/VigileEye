package unit

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/vigileye/streaming-backend/internal/domain/entities"
)

func TestNewStreamSession(t *testing.T) {
	session := entities.NewStreamSession("sess-1", "cam-1", "user-1", "rtsp://192.168.1.1/stream", entities.DefaultStreamConfig)

	assert.Equal(t, "sess-1", session.ID)
	assert.Equal(t, "cam-1", session.CameraID)
	assert.Equal(t, "user-1", session.OwnerUserID)
	assert.Equal(t, "rtsp://192.168.1.1/stream", session.StreamURL)
	assert.Equal(t, entities.StreamStatusPending, session.Status)
	assert.Equal(t, 0, session.ViewerCount)
	assert.Equal(t, 0, session.ReconnectAttempts)
	assert.NotZero(t, session.CreatedAt)
	assert.Nil(t, session.StartedAt)
	assert.Nil(t, session.StoppedAt)
}


func TestStreamSession_Activate(t *testing.T) {
	session := entities.NewStreamSession("sess-1", "cam-1", "user-1", "rtsp://test", entities.DefaultStreamConfig)

	session.Activate()

	assert.Equal(t, entities.StreamStatusActive, session.Status)
	assert.NotNil(t, session.StartedAt)
	assert.WithinDuration(t, time.Now().UTC(), *session.StartedAt, 2*time.Second)
}

func TestStreamSession_Stop(t *testing.T) {
	session := entities.NewStreamSession("sess-1", "cam-1", "user-1", "rtsp://test", entities.DefaultStreamConfig)
	session.Activate()

	session.Stop()

	assert.Equal(t, entities.StreamStatusStopped, session.Status)
	assert.NotNil(t, session.StoppedAt)
}

func TestStreamSession_SetError(t *testing.T) {
	session := entities.NewStreamSession("sess-1", "cam-1", "user-1", "rtsp://test", entities.DefaultStreamConfig)
	session.Activate()

	session.SetError("connection timeout")

	assert.Equal(t, entities.StreamStatusError, session.Status)
	assert.Equal(t, "connection timeout", session.ErrorMessage)
}

func TestStreamSession_IsActive(t *testing.T) {
	session := entities.NewStreamSession("sess-1", "cam-1", "user-1", "rtsp://test", entities.DefaultStreamConfig)

	// Pending sessions are not active
	assert.False(t, session.IsActive())

	session.Activate()
	assert.True(t, session.IsActive())

	session.Stop()
	assert.False(t, session.IsActive())
}

func TestStreamSession_ViewerCount(t *testing.T) {
	session := entities.NewStreamSession("sess-1", "cam-1", "user-1", "rtsp://test", entities.DefaultStreamConfig)

	session.IncrementViewers()
	assert.Equal(t, 1, session.ViewerCount)

	session.IncrementViewers()
	assert.Equal(t, 2, session.ViewerCount)

	session.DecrementViewers()
	assert.Equal(t, 1, session.ViewerCount)

	session.DecrementViewers()
	assert.Equal(t, 0, session.ViewerCount)

	// Should not go negative
	session.DecrementViewers()
	assert.Equal(t, 0, session.ViewerCount)
}

func TestDefaultStreamConfig(t *testing.T) {
	cfg := entities.DefaultStreamConfig

	require.NotZero(t, cfg.FPS)
	assert.Equal(t, 15, cfg.FPS)
	assert.Equal(t, 1280, cfg.Width)
	assert.Equal(t, 720, cfg.Height)
	assert.Equal(t, "h264", cfg.Codec)
}
