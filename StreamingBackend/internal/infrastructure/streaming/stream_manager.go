package streaming

import (
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/pion/webrtc/v4"
	"github.com/rs/zerolog/log"
	"github.com/vigileye/streaming-backend/internal/domain/entities"
	domainerrors "github.com/vigileye/streaming-backend/internal/domain/errors"
	"github.com/vigileye/streaming-backend/internal/domain/repositories"
	"github.com/vigileye/streaming-backend/internal/domain/services"
	"github.com/vigileye/streaming-backend/internal/infrastructure/config"
)

// Ensure StreamManager implements services.StreamService
var _ services.StreamService = (*StreamManager)(nil)

// StreamManager orchestrates camera ingest and viewer lifecycle.
// When MediaMTX is enabled, it delegates stream ingestion to MediaMTX
// and proxies WHEP signaling for WebRTC viewers.
type StreamManager struct {
	mu sync.RWMutex

	cfg  *config.Config
	repo repositories.StreamSessionRepository

	// Legacy pion-based ingests (used when MediaMTX is disabled)
	ingests map[string]*CameraIngest

	// MediaMTX client (nil when MediaMTX is disabled)
	mediaMTX *MediaMTXClient
	// Per-camera toggle: whether this camera is actually using MediaMTX/WHEP.
	// This allows falling back to the legacy pipeline for sources that MediaMTX can't ingest.
	useMediaMTX map[string]bool

	// WHEP session URLs: viewerID → MediaMTX session URL
	whepSessions map[string]string
	whepMu       sync.RWMutex

	// JPEG frames for HTTP polling fallback
	jpegProcesses  map[string]*FFmpegProcess
	jpegIdleTimers map[string]*time.Timer
	latestFrames   map[string][]byte
	frameMu        sync.RWMutex
}

// NewStreamManager creates a new stream manager.
func NewStreamManager(cfg *config.Config, repo repositories.StreamSessionRepository) *StreamManager {
	sm := &StreamManager{
		cfg:            cfg,
		repo:           repo,
		ingests:        make(map[string]*CameraIngest),
		whepSessions:   make(map[string]string),
		jpegProcesses:  make(map[string]*FFmpegProcess),
		jpegIdleTimers: make(map[string]*time.Timer),
		latestFrames:   make(map[string][]byte),
		useMediaMTX:    make(map[string]bool),
	}

	if cfg.MediaMTXEnabled {
		sm.mediaMTX = NewMediaMTXClient(cfg.MediaMTXAPIURL)
		// Override WHEP base URL if the WHEP URL is different from API URL
		if cfg.MediaMTXWHEPURL != "" && cfg.MediaMTXWHEPURL != cfg.MediaMTXAPIURL {
			sm.mediaMTX = NewMediaMTXClient(cfg.MediaMTXAPIURL)
		}
		log.Info().
			Str("api_url", cfg.MediaMTXAPIURL).
			Str("whep_url", cfg.MediaMTXWHEPURL).
			Msg("MediaMTX integration enabled")
	} else {
		log.Info().Msg("MediaMTX disabled, using legacy pion/FFmpeg pipeline")
	}

	return sm
}

// GetMediaMTXClient returns the MediaMTX client (may be nil).
func (sm *StreamManager) GetMediaMTXClient() *MediaMTXClient {
	return sm.mediaMTX
}

// IsMediaMTXEnabled returns whether MediaMTX mode is active.
func (sm *StreamManager) IsMediaMTXEnabled() bool {
	return sm.cfg.MediaMTXEnabled && sm.mediaMTX != nil
}

// IsCameraUsingMediaMTX returns true if this camera is using MediaMTX/WHEP.
func (sm *StreamManager) IsCameraUsingMediaMTX(cameraID string) bool {
	if !sm.IsMediaMTXEnabled() {
		return false
	}
	sm.mu.RLock()
	defer sm.mu.RUnlock()
	return sm.useMediaMTX[cameraID]
}

func (sm *StreamManager) cameraUsesMediaMTX(cameraID string) bool {
	sm.mu.RLock()
	defer sm.mu.RUnlock()
	return sm.IsMediaMTXEnabled() && sm.useMediaMTX[cameraID]
}

// StartStream begins streaming a camera.
// With MediaMTX: registers the camera's stream URL as a MediaMTX path.
// Without MediaMTX: uses FFmpeg → RTP → pion TrackLocalStaticRTP pipeline.
func (sm *StreamManager) StartStream(cameraID, ownerUserID, streamURL string, cfgOverride *entities.StreamConfig) (*entities.StreamSession, error) {
	sm.mu.Lock()
	defer sm.mu.Unlock()

	// Return existing if already active
	if existing, ok := sm.repo.Get(cameraID); ok && existing.IsActive() {
		return existing, nil
	}

	streamCfg := entities.DefaultStreamConfig
	if cfgOverride != nil {
		if cfgOverride.FPS > 0 {
			streamCfg.FPS = cfgOverride.FPS
		}
		if cfgOverride.Width > 0 {
			streamCfg.Width = cfgOverride.Width
		}
		if cfgOverride.Height > 0 {
			streamCfg.Height = cfgOverride.Height
		}
		if cfgOverride.Codec != "" {
			streamCfg.Codec = cfgOverride.Codec
		}
		if cfgOverride.Bitrate > 0 {
			streamCfg.Bitrate = cfgOverride.Bitrate
		}
	}

	// Enforce a reasonable minimum FPS so the stream doesn't feel laggy.
	if sm.cfg != nil && sm.cfg.DefaultFPS > 0 && streamCfg.FPS < sm.cfg.DefaultFPS {
		streamCfg.FPS = sm.cfg.DefaultFPS
	}
	// Enforce defaults for resolution/bitrate when unset or too low.
	if sm.cfg != nil {
		if sm.cfg.DefaultWidth > 0 && streamCfg.Width < sm.cfg.DefaultWidth {
			streamCfg.Width = sm.cfg.DefaultWidth
		}
		if sm.cfg.DefaultHeight > 0 && streamCfg.Height < sm.cfg.DefaultHeight {
			streamCfg.Height = sm.cfg.DefaultHeight
		}
		if sm.cfg.DefaultBitrate > 0 && streamCfg.Bitrate < sm.cfg.DefaultBitrate {
			streamCfg.Bitrate = sm.cfg.DefaultBitrate
		}
	}

	// Decide whether we must transcode to WebRTC-safe H.264.
	// WebRTC interoperability is best with (constrained) baseline and no B-frames.
	needsTranscode := false
	if sm.cfg != nil {
		probe, _ := ProbeStream(sm.cfg.FFprobePath, streamURL)
		if probe != nil && probe.Reachable && probe.HasVideo {
			vc := strings.ToLower(strings.TrimSpace(probe.VideoCodec))
			profile := strings.ToLower(strings.TrimSpace(probe.VideoProfile))
			if vc != "h264" || probe.HasBFrames {
				needsTranscode = true
			} else if profile != "" && !strings.Contains(profile, "baseline") {
				needsTranscode = true
			}
		}
	}

	lowerURL := strings.ToLower(streamURL)
	if (strings.HasPrefix(lowerURL, "http://") || strings.HasPrefix(lowerURL, "https://")) && strings.Contains(lowerURL, ".m3u8") {
		// HLS inputs can be ingested faster-than-realtime without pacing; transcoding enforces stable 1x timing.
		needsTranscode = true
	}

	session := entities.NewStreamSession(
		uuid.New().String(),
		cameraID,
		ownerUserID,
		streamURL,
		streamCfg,
	)
	sm.repo.Save(session)

	if sm.IsMediaMTXEnabled() && !needsTranscode {
		// ─── MediaMTX path ───
		addedToMediaMTX := false
		if err := sm.mediaMTX.AddPath(cameraID, streamURL); err != nil {
			// Fall back to the legacy pipeline when MediaMTX can't ingest the source.
			// This prevents hard failures for common sources like HTTP MP4 URLs.
			log.Warn().Err(err).Str("camera_id", cameraID).Msg("MediaMTX path creation failed, falling back to legacy pipeline")
			session.ErrorMessage = "MediaMTX disabled for this stream: " + err.Error()
			sm.repo.Save(session)

			ingest := NewCameraIngest(cameraID, streamURL, streamCfg.FPS, streamCfg.Width, streamCfg.Height, streamCfg.Bitrate, needsTranscode, sm.cfg)
			if err2 := ingest.Start(); err2 != nil {
				log.Warn().Err(err2).Str("camera_id", cameraID).Msg("Legacy WebRTC ingest failed, running JPEG-only")
			} else {
				sm.ingests[cameraID] = ingest
			}
			sm.useMediaMTX[cameraID] = false
		} else {
			addedToMediaMTX = true
		}
		if addedToMediaMTX {
			sm.useMediaMTX[cameraID] = true
			log.Info().Str("camera_id", cameraID).Str("source", streamURL).Msg("MediaMTX path registered")
		}
	} else {
		// ─── Legacy: FFmpeg → RTP → pion ───
		sm.useMediaMTX[cameraID] = false
		ingest := NewCameraIngest(cameraID, streamURL, streamCfg.FPS, streamCfg.Width, streamCfg.Height, streamCfg.Bitrate, needsTranscode, sm.cfg)
		if err := ingest.Start(); err != nil {
			log.Warn().Err(err).Str("camera_id", cameraID).Msg("WebRTC ingest failed, running JPEG-only")
		} else {
			sm.ingests[cameraID] = ingest
		}
	}

	// Start JPEG extraction for HTTP polling fallback (both modes)
	// NOTE: JPEG extraction is started lazily on-demand by the HTTP frame endpoint.

	session.Activate()
	sm.repo.Save(session)

	log.Info().
		Str("camera_id", cameraID).
		Str("stream_url", streamURL).
		Int("fps", streamCfg.FPS).
		Bool("mediamtx", sm.IsMediaMTXEnabled()).
		Msg("Stream started")

	return session, nil
}

// StopStream stops a camera stream and all its viewers.
func (sm *StreamManager) StopStream(cameraID string) (*entities.StreamSession, error) {
	sm.mu.Lock()
	defer sm.mu.Unlock()

	session, ok := sm.repo.Get(cameraID)
	if !ok {
		return nil, domainerrors.NewStreamNotFoundError(cameraID)
	}

	if sm.cameraUsesMediaMTX(cameraID) {
		// Remove path from MediaMTX
		if err := sm.mediaMTX.RemovePath(cameraID); err != nil {
			log.Warn().Err(err).Str("camera_id", cameraID).Msg("Failed to remove MediaMTX path")
		}
	}

	// Stop legacy WebRTC ingest (may be running even when MediaMTX is enabled)
	if ingest, ok := sm.ingests[cameraID]; ok {
		ingest.Stop()
		delete(sm.ingests, cameraID)
	}

	// Stop JPEG extraction
	sm.stopJPEGExtraction(cameraID)

	// Clean up WHEP sessions for this camera
	sm.cleanWHEPSessionsForCamera(cameraID)

	session.Stop()
	sm.repo.Save(session)
	sm.repo.Remove(cameraID)
	delete(sm.useMediaMTX, cameraID)

	log.Info().Str("camera_id", cameraID).Msg("Stream stopped")
	return session, nil
}

// StopAll stops all active streams.
func (sm *StreamManager) StopAll() {
	sm.mu.Lock()
	defer sm.mu.Unlock()

	if sm.IsMediaMTXEnabled() {
		// Remove all paths from MediaMTX
		for _, session := range sm.repo.GetAll() {
			if sm.useMediaMTX[session.CameraID] {
				if err := sm.mediaMTX.RemovePath(session.CameraID); err != nil {
					log.Warn().Err(err).Str("camera_id", session.CameraID).Msg("Failed to remove MediaMTX path")
				}
			}
		}
	}

	for cameraID, ingest := range sm.ingests {
		ingest.Stop()
		delete(sm.ingests, cameraID)
	}

	for cameraID := range sm.jpegProcesses {
		sm.stopJPEGExtraction(cameraID)
	}

	for cameraID := range sm.useMediaMTX {
		delete(sm.useMediaMTX, cameraID)
	}

	log.Info().Msg("All streams stopped")
}

// GetSession returns the session for a camera.
func (sm *StreamManager) GetSession(cameraID string) (*entities.StreamSession, bool) {
	return sm.repo.Get(cameraID)
}

// GetAllSessions returns all sessions.
func (sm *StreamManager) GetAllSessions() []*entities.StreamSession {
	return sm.repo.GetAll()
}

// IsStreaming checks if a camera is actively streaming.
func (sm *StreamManager) IsStreaming(cameraID string) bool {
	session, ok := sm.repo.Get(cameraID)
	return ok && session.IsActive()
}

// AddViewer increments the viewer count.
func (sm *StreamManager) AddViewer(cameraID string) {
	if session, ok := sm.repo.Get(cameraID); ok {
		session.IncrementViewers()
		sm.repo.Save(session)
	}
}

// RemoveViewer decrements the viewer count.
func (sm *StreamManager) RemoveViewer(cameraID string) {
	if session, ok := sm.repo.Get(cameraID); ok {
		session.DecrementViewers()
		sm.repo.Save(session)
	}
}

// GetRealTimeInfo returns streaming statistics.
func (sm *StreamManager) GetRealTimeInfo(cameraID string) *services.RealTimeInfo {
	session, ok := sm.repo.Get(cameraID)
	if !ok {
		return nil
	}

	info := &services.RealTimeInfo{
		Status:      string(session.Status),
		ViewerCount: session.ViewerCount,
	}

	if sm.cameraUsesMediaMTX(cameraID) {
		// Get stats from MediaMTX
		pathStatus, err := sm.mediaMTX.GetPathStatus(cameraID)
		if err == nil && pathStatus != nil {
			info.ViewerCount = len(pathStatus.Readers)
			if pathStatus.Ready {
				info.Status = "active"
			}
		}
		info.CurrentFPS = session.Config.FPS
	} else {
		sm.mu.RLock()
		ingest, hasIngest := sm.ingests[cameraID]
		sm.mu.RUnlock()

		if hasIngest {
			fps, bitrate, viewers := ingest.GetStats()
			info.CurrentFPS = fps
			info.Bitrate = bitrate
			if viewers > info.ViewerCount {
				info.ViewerCount = viewers
			}
		} else if session.IsActive() {
			info.CurrentFPS = session.Config.FPS
		}
	}

	if session.StartedAt != nil {
		info.Uptime = int64(time.Since(*session.StartedAt).Seconds())
	}

	return info
}

// GetICEServers returns ICE server configuration.
func (sm *StreamManager) GetICEServers() []services.ICEServer {
	servers := []services.ICEServer{}

	if sm.cfg.STUNServer != "" {
		servers = append(servers, services.ICEServer{URLs: sm.cfg.STUNServer})
	}
	if sm.cfg.TURNServer != "" && sm.cfg.TURNUsername != "" && sm.cfg.TURNCredential != "" {
		servers = append(servers, services.ICEServer{
			URLs:       sm.cfg.TURNServer,
			Username:   sm.cfg.TURNUsername,
			Credential: sm.cfg.TURNCredential,
		})
	}

	return servers
}

// GetLatestFrame returns the latest JPEG frame for HTTP polling.
func (sm *StreamManager) GetLatestFrame(cameraID string) []byte {
	// Lazily start (or keep alive) JPEG extraction only when someone is actually
	// requesting frames. This avoids double-pulling the source stream (MediaMTX + FFmpeg)
	// and drastically reduces CPU/bandwidth, which otherwise causes lag.
	sm.ensureJPEGExtractionForHTTP(cameraID)

	sm.frameMu.RLock()
	defer sm.frameMu.RUnlock()
	return sm.latestFrames[cameraID]
}

const jpegIdleTimeout = 30 * time.Second

func (sm *StreamManager) resetJPEGIdleTimerLocked(cameraID string) {
	if t, ok := sm.jpegIdleTimers[cameraID]; ok && t != nil {
		t.Reset(jpegIdleTimeout)
		return
	}

	sm.jpegIdleTimers[cameraID] = time.AfterFunc(jpegIdleTimeout, func() {
		// Stop extraction after a period of no HTTP frame requests.
		sm.mu.Lock()
		defer sm.mu.Unlock()
		sm.stopJPEGExtractionLocked(cameraID)
		if t2, ok := sm.jpegIdleTimers[cameraID]; ok && t2 != nil {
			t2.Stop()
		}
		delete(sm.jpegIdleTimers, cameraID)
	})
}

func (sm *StreamManager) ensureJPEGExtractionForHTTP(cameraID string) {
	sm.mu.Lock()
	defer sm.mu.Unlock()

	// Keep alive / start only for active sessions.
	session, ok := sm.repo.Get(cameraID)
	if !ok || session == nil || !session.IsActive() {
		return
	}

	sm.resetJPEGIdleTimerLocked(cameraID)

	if _, ok := sm.jpegProcesses[cameraID]; ok {
		return
	}

	jpegCfg := session.Config

	// If this camera is using MediaMTX, the primary viewing path is WHEP/WebRTC.
	// In that case, HTTP JPEG frames are typically used only for thumbnails.
	// Keep them very cheap so they don't steal CPU/bandwidth and cause lag.
	if sm.useMediaMTX[cameraID] {
		jpegCfg.FPS = 2
		jpegCfg.Width = 640
		jpegCfg.Height = 360
	} else {
		// Legacy/no-MediaMTX: HTTP frames may be used as the primary fallback.
		if jpegCfg.FPS <= 0 {
			jpegCfg.FPS = 10
		}
		if jpegCfg.FPS > 10 {
			jpegCfg.FPS = 10
		}
		// Cap resolution to 854x480 to reduce CPU while still being usable.
		if jpegCfg.Width <= 0 {
			jpegCfg.Width = 854
		}
		if jpegCfg.Height <= 0 {
			jpegCfg.Height = 480
		}
		if jpegCfg.Width > 854 {
			jpegCfg.Width = 854
		}
		if jpegCfg.Height > 480 {
			jpegCfg.Height = 480
		}
	}

	sm.startJPEGExtractionLocked(cameraID, session.StreamURL, jpegCfg)
}

// ─── WebRTC Signaling ───

// NegotiateWebRTC handles a WebRTC offer from a viewer and returns the answer.
// With MediaMTX: proxies the SDP offer/answer via WHEP.
// Without MediaMTX: uses pion PeerConnection directly.
func (sm *StreamManager) NegotiateWebRTC(cameraID, viewerID string, offer webrtc.SessionDescription) (*webrtc.SessionDescription, error) {
	if sm.cameraUsesMediaMTX(cameraID) {
		return sm.negotiateViaWHEP(cameraID, viewerID, offer)
	}
	return sm.negotiateViaLegacy(cameraID, viewerID, offer)
}

// negotiateViaWHEP proxies WebRTC signaling through MediaMTX WHEP.
func (sm *StreamManager) negotiateViaWHEP(cameraID, viewerID string, offer webrtc.SessionDescription) (*webrtc.SessionDescription, error) {
	// Ensure the path is actually producing media before attempting WHEP.
	// Without this, MediaMTX can legitimately return 404 "no stream is available" for a short time
	// right after adding/updating the path config.
	if sm.mediaMTX != nil {
		ready, err := sm.mediaMTX.WaitPathReady(cameraID, 8*time.Second)
		if err != nil {
			return nil, domainerrors.NewStreamConnectionError(cameraID, "MediaMTX path readiness check failed: "+err.Error())
		}
		if !ready {
			return nil, domainerrors.NewStreamConnectionError(cameraID, "MediaMTX stream is not ready yet")
		}
	}

	// Use the WHEP-specific URL if configured, otherwise fall back to API URL
	whepClient := NewMediaMTXClient(sm.cfg.MediaMTXWHEPURL)

	answerSDP, sessionURL, err := whepClient.WHEPOffer(cameraID, offer.SDP)
	if err != nil {
		return nil, domainerrors.NewStreamConnectionError(cameraID, "WHEP negotiation failed: "+err.Error())
	}

	// Store WHEP session URL for this viewer (for ICE candidates and cleanup)
	sm.whepMu.Lock()
	sm.whepSessions[viewerID] = sessionURL
	sm.whepMu.Unlock()

	answer := &webrtc.SessionDescription{
		Type: webrtc.SDPTypeAnswer,
		SDP:  answerSDP,
	}

	log.Info().
		Str("camera_id", cameraID).
		Str("viewer_id", viewerID).
		Str("session_url", sessionURL).
		Msg("WHEP session established via MediaMTX")

	return answer, nil
}

// negotiateViaLegacy uses the pion-based direct WebRTC pipeline.
func (sm *StreamManager) negotiateViaLegacy(cameraID, viewerID string, offer webrtc.SessionDescription) (*webrtc.SessionDescription, error) {
	sm.mu.RLock()
	ingest, ok := sm.ingests[cameraID]
	sm.mu.RUnlock()

	if !ok {
		return nil, domainerrors.NewStreamNotFoundError(cameraID)
	}

	return ingest.AddViewer(viewerID, offer)
}

// AddICECandidate adds an ICE candidate for a viewer.
func (sm *StreamManager) AddICECandidate(cameraID, viewerID string, candidate webrtc.ICECandidateInit) error {
	if sm.IsMediaMTXEnabled() {
		return sm.addICEViaWHEP(viewerID, candidate)
	}

	sm.mu.RLock()
	ingest, ok := sm.ingests[cameraID]
	sm.mu.RUnlock()

	if !ok {
		return domainerrors.NewStreamNotFoundError(cameraID)
	}

	return ingest.AddICECandidate(viewerID, candidate)
}

// addICEViaWHEP sends a trickle ICE candidate to MediaMTX via WHEP.
func (sm *StreamManager) addICEViaWHEP(viewerID string, candidate webrtc.ICECandidateInit) error {
	sm.whepMu.RLock()
	sessionURL, ok := sm.whepSessions[viewerID]
	sm.whepMu.RUnlock()

	if !ok {
		return domainerrors.NewValidationError("WHEP session not found for viewer: " + viewerID)
	}

	whepClient := NewMediaMTXClient(sm.cfg.MediaMTXWHEPURL)
	return whepClient.WHEPAddICECandidate(sessionURL, candidate.Candidate)
}

// DisconnectViewer removes a viewer from a camera's ingest.
func (sm *StreamManager) DisconnectViewer(cameraID, viewerID string) {
	if sm.IsMediaMTXEnabled() {
		sm.disconnectViaWHEP(viewerID)
	} else {
		sm.mu.RLock()
		ingest, ok := sm.ingests[cameraID]
		sm.mu.RUnlock()

		if ok {
			ingest.RemoveViewer(viewerID)
		}
	}
	sm.RemoveViewer(cameraID)
}

// disconnectViaWHEP tears down a WHEP session.
func (sm *StreamManager) disconnectViaWHEP(viewerID string) {
	sm.whepMu.Lock()
	sessionURL, ok := sm.whepSessions[viewerID]
	if ok {
		delete(sm.whepSessions, viewerID)
	}
	sm.whepMu.Unlock()

	if ok && sessionURL != "" {
		whepClient := NewMediaMTXClient(sm.cfg.MediaMTXWHEPURL)
		if err := whepClient.WHEPDelete(sessionURL); err != nil {
			log.Warn().Err(err).Str("viewer_id", viewerID).Msg("Failed to delete WHEP session")
		}
	}
}

// cleanWHEPSessionsForCamera removes all WHEP sessions that belong to a camera.
// Note: we don't track camera→viewer mapping for WHEP, but we clean all for simplicity.
func (sm *StreamManager) cleanWHEPSessionsForCamera(cameraID string) {
	// In a production system, you'd maintain a camera→viewerIDs index.
	// For now, WHEP sessions will time out in MediaMTX automatically.
	_ = cameraID
}

// ─── JPEG Extraction (HTTP polling fallback) ───

func (sm *StreamManager) startJPEGExtractionLocked(cameraID, streamURL string, cfg entities.StreamConfig) {
	if _, ok := sm.jpegProcesses[cameraID]; ok {
		return
	}

	ffmpeg := NewFFmpegProcess()
	ffmpeg.OnFrame = func(frame []byte) {
		sm.frameMu.Lock()
		sm.latestFrames[cameraID] = frame
		sm.frameMu.Unlock()

		if session, ok := sm.repo.Get(cameraID); ok {
			now := time.Now().UTC()
			session.LastFrameAt = &now
		}
	}

	ffmpeg.OnClose = func(code int) {
		log.Info().Str("camera_id", cameraID).Int("exit_code", code).Msg("JPEG FFmpeg exited")
		sm.mu.Lock()
		delete(sm.jpegProcesses, cameraID)
		sm.mu.Unlock()

		// Auto-reconnect
		if session, ok := sm.repo.Get(cameraID); ok && session.IsActive() && session.ReconnectAttempts < sm.cfg.MaxReconnectAttempts {
			session.ReconnectAttempts++
			time.AfterFunc(time.Duration(sm.cfg.ReconnectDelayMs)*time.Millisecond, func() {
				sm.mu.Lock()
				defer sm.mu.Unlock()
				if _, stillActive := sm.repo.Get(cameraID); stillActive {
					sm.startJPEGExtractionLocked(cameraID, streamURL, cfg)
				}
			})
		}
	}

	if err := ffmpeg.Start(FFmpegOptions{
		StreamURL: streamURL,
		FPS:       cfg.FPS,
		Width:     cfg.Width,
		Height:    cfg.Height,
		FFmpegBin: sm.cfg.FFmpegPath,
	}); err != nil {
		log.Error().Err(err).Str("camera_id", cameraID).Msg("Failed to start JPEG extraction")
		return
	}

	sm.jpegProcesses[cameraID] = ffmpeg
}

func (sm *StreamManager) stopJPEGExtractionLocked(cameraID string) {
	if ffmpeg, ok := sm.jpegProcesses[cameraID]; ok {
		ffmpeg.Stop()
		delete(sm.jpegProcesses, cameraID)
	}
	sm.frameMu.Lock()
	delete(sm.latestFrames, cameraID)
	sm.frameMu.Unlock()
}

func (sm *StreamManager) stopJPEGExtraction(cameraID string) {
	sm.mu.Lock()
	defer sm.mu.Unlock()
	sm.stopJPEGExtractionLocked(cameraID)
	if t, ok := sm.jpegIdleTimers[cameraID]; ok && t != nil {
		t.Stop()
	}
	delete(sm.jpegIdleTimers, cameraID)
}
