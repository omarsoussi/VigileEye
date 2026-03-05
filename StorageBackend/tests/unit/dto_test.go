package unit

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/vigileye/storage-backend/internal/application/dto"
)

func TestFormatTime(t *testing.T) {
	ts := time.Date(2026, 3, 5, 12, 0, 0, 0, time.UTC)
	result := dto.FormatTime(ts)
	assert.Equal(t, "2026-03-05T12:00:00Z", result)
}

func TestFormatTime_Zero(t *testing.T) {
	result := dto.FormatTime(time.Time{})
	assert.Equal(t, "", result)
}

func TestFormatTimePtr(t *testing.T) {
	ts := time.Date(2026, 3, 5, 14, 30, 0, 0, time.UTC)
	result := dto.FormatTimePtr(&ts)
	assert.NotNil(t, result)
	assert.Equal(t, "2026-03-05T14:30:00Z", *result)
}

func TestFormatTimePtr_Nil(t *testing.T) {
	result := dto.FormatTimePtr(nil)
	assert.Nil(t, result)
}
