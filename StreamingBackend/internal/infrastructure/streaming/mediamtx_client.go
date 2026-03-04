package streaming

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/rs/zerolog/log"
)

// MediaMTXClient manages streams through the MediaMTX REST API.
// MediaMTX handles RTSP/RTMP/HLS ingest → WebRTC/HLS/RTSP output.
type MediaMTXClient struct {
	apiURL string
	client *http.Client
}

// NewMediaMTXClient creates a new MediaMTX API client.
func NewMediaMTXClient(apiURL string) *MediaMTXClient {
	return &MediaMTXClient{
		apiURL: strings.TrimRight(apiURL, "/"),
		client: &http.Client{Timeout: 10 * time.Second},
	}
}

// ─── Path Management ───

// MediaMTXPathConfig represents a MediaMTX path configuration.
type MediaMTXPathConfig struct {
	Name          string `json:"name,omitempty"`
	Source        string `json:"source,omitempty"`
	SourceOnDemand *bool `json:"sourceOnDemand,omitempty"`
	Record        *bool  `json:"record,omitempty"`
	// MaxReaders limits concurrent readers (0 = unlimited)
	MaxReaders    int    `json:"maxReaders,omitempty"`
}

// MediaMTXPathStatus represents the status of a MediaMTX path.
type MediaMTXPathStatus struct {
	Name          string            `json:"name"`
	Source        *MediaMTXSource   `json:"source"`
	Readers       []MediaMTXReader  `json:"readers"`
	Ready         bool              `json:"ready"`
	BytesReceived int64             `json:"bytesReceived"`
	BytesSent     int64             `json:"bytesSent"`
}

// MediaMTXSource represents a source connected to a path.
type MediaMTXSource struct {
	Type string `json:"type"`
	ID   string `json:"id"`
}

// MediaMTXReader represents a reader (viewer) of a path.
type MediaMTXReader struct {
	Type string `json:"type"`
	ID   string `json:"id"`
}

// MediaMTXPathList is the response for listing paths.
type MediaMTXPathList struct {
	ItemCount int                  `json:"itemCount"`
	PageCount int                  `json:"pageCount"`
	Items     []MediaMTXPathStatus `json:"items"`
}

func isHTTPURL(u string) bool {
	lower := strings.ToLower(u)
	return strings.HasPrefix(lower, "http://") || strings.HasPrefix(lower, "https://")
}

func hasAnySuffix(s string, suffixes ...string) bool {
	for _, suf := range suffixes {
		if strings.HasSuffix(s, suf) {
			return true
		}
	}
	return false
}

// normalizeHLSSourceURL tries to resolve HLS master playlists to a concrete variant.
// If the content isn't a master playlist (or the request fails), it returns the original URL.
func (c *MediaMTXClient) normalizeHLSSourceURL(sourceURL string) (string, error) {
	lower := strings.ToLower(sourceURL)
	if !isHTTPURL(lower) || !strings.HasSuffix(lower, ".m3u8") {
		return sourceURL, nil
	}

	req, err := http.NewRequest("GET", sourceURL, nil)
	if err != nil {
		return sourceURL, err
	}
	req.Header.Set("Accept", "application/vnd.apple.mpegurl, application/x-mpegurl, */*")

	resp, err := c.client.Do(req)
	if err != nil {
		return sourceURL, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return sourceURL, fmt.Errorf("fetch HLS playlist failed (status %d)", resp.StatusCode)
	}

	// Avoid reading unbounded data.
	const maxBytes = 256 * 1024
	body, err := io.ReadAll(io.LimitReader(resp.Body, maxBytes))
	if err != nil {
		return sourceURL, err
	}

	lines := strings.Split(string(body), "\n")
	isMaster := false
	for idx, raw := range lines {
		line := strings.TrimSpace(raw)
		if line == "" {
			continue
		}
		if strings.HasPrefix(line, "#EXT-X-STREAM-INF") {
			isMaster = true
			// Next non-empty, non-comment line should be the variant URI.
			for j := idx + 1; j < len(lines); j++ {
				candidate := strings.TrimSpace(lines[j])
				if candidate == "" || strings.HasPrefix(candidate, "#") {
					continue
				}
				baseParsed, perr := url.Parse(sourceURL)
				if perr != nil {
					return sourceURL, perr
				}
				refParsed, rerr := url.Parse(candidate)
				if rerr != nil {
					return sourceURL, rerr
				}
				resolved := baseParsed.ResolveReference(refParsed).String()
				if resolved != "" {
					log.Info().Str("source", sourceURL).Str("variant", resolved).Msg("Resolved HLS master playlist to variant")
					return resolved, nil
				}
				break
			}
		}
	}

	if isMaster {
		// It looked like a master playlist but we couldn't resolve a variant.
		return sourceURL, fmt.Errorf("failed to resolve HLS master playlist variant")
	}
	return sourceURL, nil
}

// WaitPathReady waits until a path becomes ready (i.e. MediaMTX is receiving media).
// Returns (true, nil) when ready, (false, nil) on timeout.
func (c *MediaMTXClient) WaitPathReady(pathName string, timeout time.Duration) (bool, error) {
	deadline := time.Now().Add(timeout)
	ticker := time.NewTicker(250 * time.Millisecond)
	defer ticker.Stop()

	for {
		status, err := c.GetPathStatus(pathName)
		if err != nil {
			return false, err
		}
		if status != nil && status.Ready {
			return true, nil
		}
		if time.Now().After(deadline) {
			return false, nil
		}
		<-ticker.C
	}
}

// AddPath adds or updates a stream path in MediaMTX.
// The path name is the cameraID, source is the RTSP/HTTP stream URL.
func (c *MediaMTXClient) AddPath(pathName, sourceURL string) error {
	// MediaMTX's built-in HTTP ingest is HLS-focused. A direct MP4 file URL
	// (while playable by ffmpeg) can cause MediaMTX to hang/time out.
	if isHTTPURL(sourceURL) && hasAnySuffix(strings.ToLower(sourceURL), ".mp4", ".mov", ".m4v") {
		return fmt.Errorf("unsupported HTTP source for MediaMTX (expected HLS .m3u8 or RTSP): %s", sourceURL)
	}

	// Some public test streams provide a master playlist. Resolving to a concrete
	// variant reduces ambiguity and can improve ingest reliability.
	if normalized, err := c.normalizeHLSSourceURL(sourceURL); err == nil && normalized != "" {
		sourceURL = normalized
	}

	onDemand := false
	record := false
	cfg := MediaMTXPathConfig{
		Source:         sourceURL,
		SourceOnDemand: &onDemand,
		Record:         &record,
	}

	body, err := json.Marshal(cfg)
	if err != nil {
		return fmt.Errorf("marshal path config: %w", err)
	}

	url := fmt.Sprintf("%s/v3/config/paths/add/%s", c.apiURL, pathName)
	req, err := http.NewRequest("POST", url, bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.client.Do(req)
	if err != nil {
		return fmt.Errorf("add path request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusOK || resp.StatusCode == http.StatusCreated || resp.StatusCode == http.StatusNoContent {
		log.Info().Str("path", pathName).Str("source", sourceURL).Msg("MediaMTX path added")
		return nil
	}

	// If path already exists, try PATCH to update it
	if resp.StatusCode == http.StatusConflict {
		return c.UpdatePath(pathName, sourceURL)
	}

	respBody, _ := io.ReadAll(resp.Body)
	return fmt.Errorf("add path failed (status %d): %s", resp.StatusCode, string(respBody))
}

// UpdatePath updates an existing path configuration.
func (c *MediaMTXClient) UpdatePath(pathName, sourceURL string) error {
	cfg := MediaMTXPathConfig{
		Source: sourceURL,
	}

	body, err := json.Marshal(cfg)
	if err != nil {
		return fmt.Errorf("marshal path config: %w", err)
	}

	url := fmt.Sprintf("%s/v3/config/paths/patch/%s", c.apiURL, pathName)
	req, err := http.NewRequest("PATCH", url, bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.client.Do(req)
	if err != nil {
		return fmt.Errorf("patch path request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusOK || resp.StatusCode == http.StatusNoContent {
		log.Info().Str("path", pathName).Str("source", sourceURL).Msg("MediaMTX path updated")
		return nil
	}

	respBody, _ := io.ReadAll(resp.Body)
	return fmt.Errorf("update path failed (status %d): %s", resp.StatusCode, string(respBody))
}

// RemovePath removes a stream path from MediaMTX.
func (c *MediaMTXClient) RemovePath(pathName string) error {
	url := fmt.Sprintf("%s/v3/config/paths/delete/%s", c.apiURL, pathName)
	req, err := http.NewRequest("DELETE", url, nil)
	if err != nil {
		return fmt.Errorf("create request: %w", err)
	}

	resp, err := c.client.Do(req)
	if err != nil {
		return fmt.Errorf("delete path request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusOK || resp.StatusCode == http.StatusNoContent || resp.StatusCode == http.StatusNotFound {
		log.Info().Str("path", pathName).Msg("MediaMTX path removed")
		return nil
	}

	respBody, _ := io.ReadAll(resp.Body)
	return fmt.Errorf("remove path failed (status %d): %s", resp.StatusCode, string(respBody))
}

// ─── Path Status ───

// GetPathStatus returns the status of a specific path.
func (c *MediaMTXClient) GetPathStatus(pathName string) (*MediaMTXPathStatus, error) {
	url := fmt.Sprintf("%s/v3/paths/get/%s", c.apiURL, pathName)
	resp, err := c.client.Get(url)
	if err != nil {
		return nil, fmt.Errorf("get path status: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		return nil, nil
	}

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("get path status failed (status %d): %s", resp.StatusCode, string(respBody))
	}

	var status MediaMTXPathStatus
	if err := json.NewDecoder(resp.Body).Decode(&status); err != nil {
		return nil, fmt.Errorf("decode path status: %w", err)
	}

	return &status, nil
}

// ListPaths returns all active paths.
func (c *MediaMTXClient) ListPaths() (*MediaMTXPathList, error) {
	url := fmt.Sprintf("%s/v3/paths/list", c.apiURL)
	resp, err := c.client.Get(url)
	if err != nil {
		return nil, fmt.Errorf("list paths: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("list paths failed (status %d): %s", resp.StatusCode, string(respBody))
	}

	var list MediaMTXPathList
	if err := json.NewDecoder(resp.Body).Decode(&list); err != nil {
		return nil, fmt.Errorf("decode path list: %w", err)
	}

	return &list, nil
}

// ─── WHEP (WebRTC HTTP Egress Protocol) ───

// WHEPOffer sends an SDP offer to MediaMTX's WHEP endpoint and returns the answer.
// This is the standard WebRTC playback protocol supported by MediaMTX.
func (c *MediaMTXClient) WHEPOffer(pathName, sdpOffer string) (sdpAnswer string, whepSessionURL string, err error) {
	// MediaMTX WHEP endpoint: POST /pathName/whep
	// The base URL for WHEP is the MediaMTX HTTP address (typically port 8889)
	whepURL := fmt.Sprintf("%s/%s/whep", c.getWHEPBaseURL(), pathName)

	req, err := http.NewRequest("POST", whepURL, strings.NewReader(sdpOffer))
	if err != nil {
		return "", "", fmt.Errorf("create WHEP request: %w", err)
	}
	req.Header.Set("Content-Type", "application/sdp")

	resp, err := c.client.Do(req)
	if err != nil {
		return "", "", fmt.Errorf("WHEP request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated && resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return "", "", fmt.Errorf("WHEP offer failed (status %d): %s", resp.StatusCode, string(respBody))
	}

	answerBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", "", fmt.Errorf("read WHEP answer: %w", err)
	}

	// The Location header contains the session URL for ICE candidates and teardown
	sessionURL := resp.Header.Get("Location")
	if sessionURL != "" {
		if resolved, rerr := resolveRelativeURL(whepURL, sessionURL); rerr == nil {
			sessionURL = resolved
		}
	}

	return string(answerBody), sessionURL, nil
}

func resolveRelativeURL(baseURL, ref string) (string, error) {
	baseParsed, err := url.Parse(baseURL)
	if err != nil {
		return "", err
	}
	refParsed, err := url.Parse(ref)
	if err != nil {
		return "", err
	}
	return baseParsed.ResolveReference(refParsed).String(), nil
}

// WHEPAddICECandidate sends a trickle ICE candidate to a WHEP session.
func (c *MediaMTXClient) WHEPAddICECandidate(sessionURL, candidate string) error {
	// Resolve relative session URLs
	if !strings.HasPrefix(sessionURL, "http") {
		sessionURL = fmt.Sprintf("%s%s", c.getWHEPBaseURL(), sessionURL)
	}

	req, err := http.NewRequest("PATCH", sessionURL, strings.NewReader(candidate))
	if err != nil {
		return fmt.Errorf("create ICE candidate request: %w", err)
	}
	req.Header.Set("Content-Type", "application/trickle-ice-sdpfrag")

	resp, err := c.client.Do(req)
	if err != nil {
		return fmt.Errorf("ICE candidate request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusNoContent && resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("ICE candidate failed (status %d): %s", resp.StatusCode, string(respBody))
	}

	return nil
}

// WHEPDelete tears down a WHEP session.
func (c *MediaMTXClient) WHEPDelete(sessionURL string) error {
	if !strings.HasPrefix(sessionURL, "http") {
		sessionURL = fmt.Sprintf("%s%s", c.getWHEPBaseURL(), sessionURL)
	}

	req, err := http.NewRequest("DELETE", sessionURL, nil)
	if err != nil {
		return fmt.Errorf("create WHEP delete request: %w", err)
	}

	resp, err := c.client.Do(req)
	if err != nil {
		return fmt.Errorf("WHEP delete request: %w", err)
	}
	defer resp.Body.Close()

	return nil
}

// getWHEPBaseURL returns the WHEP base URL.
// MediaMTX serves WHEP on the same API host (typically port 8889).
func (c *MediaMTXClient) getWHEPBaseURL() string {
	// The apiURL is the MediaMTX API URL. WHEP is served on the same base.
	return c.apiURL
}

// ─── Health ───

// IsHealthy checks if MediaMTX is reachable.
func (c *MediaMTXClient) IsHealthy() bool {
	url := fmt.Sprintf("%s/v3/paths/list", c.apiURL)
	resp, err := c.client.Get(url)
	if err != nil {
		return false
	}
	defer resp.Body.Close()
	return resp.StatusCode == http.StatusOK
}
