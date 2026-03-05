package external

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/vigileye/storage-backend/internal/domain/entities"
	"github.com/vigileye/storage-backend/internal/domain/errors"
	"github.com/vigileye/storage-backend/internal/infrastructure/config"
)

// cameraAPIResponse is the raw JSON shape from Camera Management API.
type cameraAPIResponse struct {
	ID          string  `json:"id"`
	OwnerUserID string  `json:"owner_user_id"`
	Name        string  `json:"name"`
	Description *string `json:"description"`
	StreamURL   string  `json:"stream_url"`
	Protocol    string  `json:"protocol"`
	Resolution  string  `json:"resolution"`
	FPS         int     `json:"fps"`
	Encoding    string  `json:"encoding"`
	Status      string  `json:"status"`
	CameraType  string  `json:"camera_type"`
	IsActive    bool    `json:"is_active"`
}

func mapCamera(raw *cameraAPIResponse) *entities.Camera {
	desc := ""
	if raw.Description != nil {
		desc = *raw.Description
	}
	return &entities.Camera{
		ID:          raw.ID,
		OwnerUserID: raw.OwnerUserID,
		Name:        raw.Name,
		Description: desc,
		StreamURL:   raw.StreamURL,
		Protocol:    raw.Protocol,
		Resolution:  raw.Resolution,
		FPS:         raw.FPS,
		Encoding:    raw.Encoding,
		Status:      raw.Status,
		CameraType:  raw.CameraType,
		IsActive:    raw.IsActive,
	}
}

// HTTPCameraService fetches camera data from Camera Management FastAPI service.
type HTTPCameraService struct {
	baseURL string
	client  *http.Client
}

// NewHTTPCameraService creates a new camera service client.
func NewHTTPCameraService(cfg *config.Config) *HTTPCameraService {
	return &HTTPCameraService{
		baseURL: cfg.CameraServiceURL,
		client: &http.Client{
			Timeout: 5 * time.Second,
		},
	}
}

// GetCamera fetches a single camera by ID.
func (s *HTTPCameraService) GetCamera(cameraID, token string) (*entities.Camera, error) {
	req, err := http.NewRequest("GET", fmt.Sprintf("%s/api/v1/cameras/%s", s.baseURL, cameraID), nil)
	if err != nil {
		return nil, errors.NewCameraNotFoundError(cameraID)
	}
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, errors.NewCameraNotFoundError(cameraID)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		return nil, errors.NewCameraNotFoundError(cameraID)
	}
	if resp.StatusCode != http.StatusOK {
		return nil, errors.NewCameraNotFoundError(cameraID)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, errors.NewCameraNotFoundError(cameraID)
	}

	var raw cameraAPIResponse
	if err := json.Unmarshal(body, &raw); err != nil {
		return nil, errors.NewCameraNotFoundError(cameraID)
	}

	return mapCamera(&raw), nil
}

// GetCamerasForUser fetches all cameras belonging to a user.
func (s *HTTPCameraService) GetCamerasForUser(userID, token string) ([]*entities.Camera, error) {
	req, err := http.NewRequest("GET", fmt.Sprintf("%s/api/v1/cameras", s.baseURL), nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch cameras: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("camera service returned %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	var rawCameras []cameraAPIResponse
	if err := json.Unmarshal(body, &rawCameras); err != nil {
		return nil, fmt.Errorf("failed to parse cameras response: %w", err)
	}

	cameras := make([]*entities.Camera, len(rawCameras))
	for i := range rawCameras {
		cameras[i] = mapCamera(&rawCameras[i])
	}

	return cameras, nil
}
