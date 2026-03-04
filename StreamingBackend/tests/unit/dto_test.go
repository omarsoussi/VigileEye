package unit

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/vigileye/streaming-backend/internal/application/dto"
	"github.com/vigileye/streaming-backend/internal/domain/entities"
)

func TestToSessionResponse(t *testing.T) {
	session := entities.NewStreamSession("sess-1", "cam-1", "user-1", "rtsp://test", entities.DefaultStreamConfig)
	session.Activate()

	resp := dto.ToSessionResponse(session)

	assert.Equal(t, "sess-1", resp.ID)
	assert.Equal(t, "cam-1", resp.CameraID)
	assert.Equal(t, "active", resp.Status)
	assert.Equal(t, 15, resp.FPS)
	assert.NotEmpty(t, resp.StartedAt)
	assert.NotEmpty(t, resp.CreatedAt)
	assert.NotEmpty(t, resp.UpdatedAt)
	assert.Empty(t, resp.StoppedAt)
	assert.Equal(t, 0, resp.ViewerCount)
}

func TestToSessionResponse_Stopped(t *testing.T) {
	session := entities.NewStreamSession("sess-1", "cam-1", "user-1", "rtsp://test", entities.DefaultStreamConfig)
	session.Activate()
	session.Stop()

	resp := dto.ToSessionResponse(session)

	assert.Equal(t, "stopped", resp.Status)
	assert.NotEmpty(t, resp.StoppedAt)
}

func TestToSessionResponse_WithViewers(t *testing.T) {
	session := entities.NewStreamSession("sess-1", "cam-1", "user-1", "rtsp://test", entities.DefaultStreamConfig)
	session.Activate()
	session.IncrementViewers()
	session.IncrementViewers()
	session.IncrementViewers()

	resp := dto.ToSessionResponse(session)

	assert.Equal(t, 3, resp.ViewerCount)
}

func TestToSessionResponse_WithError(t *testing.T) {
	session := entities.NewStreamSession("sess-1", "cam-1", "user-1", "rtsp://test", entities.DefaultStreamConfig)
	session.SetError("connection refused")

	resp := dto.ToSessionResponse(session)

	assert.Equal(t, "error", resp.Status)
	assert.Equal(t, "connection refused", resp.ErrorMessage)
}
