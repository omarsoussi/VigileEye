package unit

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/vigileye/streaming-backend/internal/domain/entities"
)

func TestNewViewerSession(t *testing.T) {
	viewer := entities.NewViewerSession("viewer-1", "cam-1", "user-1", "test-uuid")

	assert.Equal(t, "viewer-1", viewer.ID)
	assert.Equal(t, "cam-1", viewer.CameraID)
	assert.Equal(t, "user-1", viewer.UserID)
	assert.Equal(t, entities.ViewerStateConnecting, viewer.State)
	assert.NotZero(t, viewer.ConnectedAt)
}
