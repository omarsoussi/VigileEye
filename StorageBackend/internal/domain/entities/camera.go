package entities

// Camera represents a camera fetched from Camera Management service.
type Camera struct {
	ID          string `json:"id"`
	OwnerUserID string `json:"owner_user_id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	StreamURL   string `json:"stream_url"`
	Protocol    string `json:"protocol"`
	Resolution  string `json:"resolution"`
	FPS         int    `json:"fps"`
	Encoding    string `json:"encoding"`
	Status      string `json:"status"`
	CameraType  string `json:"camera_type"`
	IsActive    bool   `json:"is_active"`
}
