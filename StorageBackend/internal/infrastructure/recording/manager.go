package recording

import (
	"bytes"
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"syscall"
	"time"

	"github.com/rs/zerolog/log"
	"github.com/vigileye/storage-backend/internal/domain/entities"
	"github.com/vigileye/storage-backend/internal/domain/repositories"
	"github.com/vigileye/storage-backend/internal/domain/services"
	"github.com/vigileye/storage-backend/internal/infrastructure/config"
)

// activeSession tracks a running FFmpeg recording process.
type activeSession struct {
	Recording *entities.Recording
	Cancel    context.CancelFunc
	Cmd       *exec.Cmd
	Stderr    *bytes.Buffer
	Done      chan struct{}
}

// RecordingManager manages concurrent FFmpeg recording sessions.
type RecordingManager struct {
	cfg            *config.Config
	storageBackend services.StorageBackend
	recordingRepo  repositories.RecordingRepository
	sessions       map[string]*activeSession // keyed by cameraID
	mu             sync.RWMutex
}

// NewRecordingManager creates a new recording manager.
func NewRecordingManager(cfg *config.Config, backend services.StorageBackend) *RecordingManager {
	return &RecordingManager{
		cfg:            cfg,
		storageBackend: backend,
		sessions:       make(map[string]*activeSession),
	}
}

// SetRecordingRepo sets the recording repository for persisting status updates.
// Called after construction to avoid circular dependencies.
func (rm *RecordingManager) SetRecordingRepo(repo repositories.RecordingRepository) {
	rm.recordingRepo = repo
}

// StartRecording begins recording a camera stream using FFmpeg.
func (rm *RecordingManager) StartRecording(
	ctx context.Context,
	cameraID, ownerUserID, streamURL string,
	storageConfig *entities.CameraStorageConfig,
) (*entities.Recording, error) {
	rm.mu.Lock()
	if _, exists := rm.sessions[cameraID]; exists {
		rm.mu.Unlock()
		return nil, fmt.Errorf("recording already active for camera %s", cameraID)
	}

	recording := entities.NewRecording(cameraID, ownerUserID, rm.storageBackend.Mode())

	// Build file path: {cameraID}/{date}/{timestamp}.mp4
	now := time.Now().UTC()
	dateDir := now.Format("2006-01-02")
	fileName := fmt.Sprintf("%s_%s.mp4", cameraID, now.Format("150405"))
	relPath := filepath.Join(cameraID, dateDir, fileName)
	recording.FileName = fileName
	recording.FilePath = relPath

	if storageConfig != nil {
		recording.Bitrate = storageConfig.Bitrate
		recording.Resolution = storageConfig.Resolution
	} else {
		recording.Bitrate = rm.cfg.DefaultBitrate
		recording.Resolution = rm.cfg.DefaultResolution
	}

	// Determine segment duration
	segmentMinutes := rm.cfg.SegmentDurationMinutes
	if storageConfig != nil && storageConfig.SegmentMinutes > 0 {
		segmentMinutes = storageConfig.SegmentMinutes
	}

	// Use a background context so FFmpeg survives after the HTTP request completes.
	_, cancel := context.WithCancel(context.Background())

	// Build FFmpeg command
	outputPath := rm.resolveOutputPath(relPath)
	os.MkdirAll(filepath.Dir(outputPath), 0755)

	// Build FFmpeg args based on stream protocol
	args := []string{"-y"}
	isHLS := strings.Contains(streamURL, ".m3u8") || strings.Contains(streamURL, "/hls/")
	isRTSP := strings.HasPrefix(streamURL, "rtsp://")

	// Add protocol-specific input options
	if isRTSP {
		args = append(args,
			"-rtsp_transport", "tcp",
			"-stimeout", "10000000", // 10s connection timeout (microseconds)
		)
	} else {
		// HTTP/HLS reconnect options
		args = append(args,
			"-reconnect", "1",
			"-reconnect_streamed", "1",
			"-reconnect_delay_max", "5",
		)
		if isHLS {
			args = append(args, "-fflags", "+genpts+discardcorrupt")
		}
	}

	args = append(args, "-i", streamURL)

	// Output encoding options: copy codecs (faster, lossless)
	args = append(args,
		"-c:v", "copy",
		"-c:a", "copy",
	)

	// HLS streams often have ADTS-wrapped AAC; MP4 container needs aac_adtstoasc bitstream filter
	if isHLS {
		args = append(args, "-bsf:a", "aac_adtstoasc")
	}

	// Use fragmented MP4 (fMP4) so the file is playable even if FFmpeg is interrupted.
	// frag_keyframe: a new fragment at every keyframe
	// empty_moov: write initial moov immediately (no data), then moof+mdat fragments
	// This means the file always has a valid moov atom from the start.
	args = append(args,
		"-f", "mp4",
		"-t", fmt.Sprintf("%d", segmentMinutes*60),
		"-movflags", "frag_keyframe+empty_moov+default_base_moof",
		outputPath,
	)

	// Do NOT use exec.CommandContext — it sends SIGKILL which corrupts MP4.
	// We manage the process lifecycle manually with SIGINT for graceful stop.
	cmd := exec.Command(rm.cfg.FFmpegPath, args...)

	// Capture stderr for debugging
	var stderrBuf bytes.Buffer
	cmd.Stdout = nil
	cmd.Stderr = &stderrBuf

	session := &activeSession{
		Recording: recording,
		Cancel:    cancel,
		Cmd:       cmd,
		Stderr:    &stderrBuf,
		Done:      make(chan struct{}),
	}

	rm.sessions[cameraID] = session
	rm.mu.Unlock()

	// Start FFmpeg in a goroutine
	go rm.runRecording(session, cameraID, outputPath, segmentMinutes)

	log.Info().
		Str("camera_id", cameraID).
		Str("file", relPath).
		Int("segment_minutes", segmentMinutes).
		Msg("Recording started")

	return recording, nil
}

// runRecording executes and monitors the FFmpeg process.
func (rm *RecordingManager) runRecording(session *activeSession, cameraID, outputPath string, segmentMinutes int) {
	defer close(session.Done)

	if err := session.Cmd.Start(); err != nil {
		stderrOutput := ""
		if session.Stderr != nil {
			stderrOutput = session.Stderr.String()
		}
		log.Error().Err(err).Str("camera_id", cameraID).Str("ffmpeg_stderr", stderrOutput).Msg("Failed to start FFmpeg")
		session.Recording.MarkFailed()
		rm.persistRecordingStatus(session.Recording)
		rm.removeSession(cameraID)
		return
	}

	log.Info().Str("camera_id", cameraID).Int("pid", session.Cmd.Process.Pid).Msg("FFmpeg process running")

	err := session.Cmd.Wait()
	if err != nil {
		stderrOutput := ""
		if session.Stderr != nil {
			stderrOutput = session.Stderr.String()
			// Limit stderr output to last 500 chars
			if len(stderrOutput) > 500 {
				stderrOutput = stderrOutput[len(stderrOutput)-500:]
			}
		}
		log.Warn().Err(err).Str("camera_id", cameraID).Str("ffmpeg_stderr", stderrOutput).Msg("FFmpeg process ended")
	}

	// Get file info
	info, statErr := os.Stat(outputPath)
	if statErr == nil && info.Size() > 0 {
		session.Recording.Complete(info.Size(), segmentMinutes*60)
		log.Info().Str("camera_id", cameraID).Int64("file_size", info.Size()).Msg("Recording completed successfully")
	} else {
		session.Recording.MarkFailed()
		if statErr != nil {
			log.Error().Err(statErr).Str("camera_id", cameraID).Msg("Output file not found")
		} else {
			log.Error().Str("camera_id", cameraID).Msg("Output file is empty")
		}
	}

	// Generate thumbnail if file exists
	if statErr == nil && info.Size() > 0 {
		thumbPath := rm.generateThumbnail(outputPath, cameraID)
		if thumbPath != "" {
			session.Recording.ThumbnailPath = thumbPath
		}
	}

	// Persist final status to database
	rm.persistRecordingStatus(session.Recording)

	rm.removeSession(cameraID)

	log.Info().
		Str("camera_id", cameraID).
		Str("status", string(session.Recording.Status)).
		Msg("Recording finished")
}

// persistRecordingStatus updates the recording status in the database.
func (rm *RecordingManager) persistRecordingStatus(rec *entities.Recording) {
	if rm.recordingRepo == nil {
		log.Warn().Str("recording_id", rec.ID).Msg("No recording repo set, cannot persist status")
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := rm.recordingRepo.Update(ctx, rec); err != nil {
		log.Error().Err(err).Str("recording_id", rec.ID).Msg("Failed to persist recording status")
	}
}

// generateThumbnail extracts a frame from the recording as a JPEG thumbnail.
func (rm *RecordingManager) generateThumbnail(videoPath, cameraID string) string {
	thumbPath := videoPath[:len(videoPath)-len(filepath.Ext(videoPath))] + "_thumb.jpg"

	cmd := exec.Command(rm.cfg.FFmpegPath,
		"-i", videoPath,
		"-ss", "00:00:01",
		"-vframes", "1",
		"-q:v", "5",
		"-y",
		thumbPath,
	)
	if err := cmd.Run(); err != nil {
		log.Warn().Err(err).Str("camera_id", cameraID).Msg("Failed to generate thumbnail")
		return ""
	}
	// Return relative path for storage
	rel, _ := filepath.Rel(rm.cfg.LocalStoragePath, thumbPath)
	if rel == "" {
		rel = thumbPath
	}
	return rel
}

// StopRecording stops an active recording for a camera.
// Sends SIGINT to FFmpeg so it can finalize the MP4 container properly.
func (rm *RecordingManager) StopRecording(ctx context.Context, cameraID string) (*entities.Recording, error) {
	rm.mu.RLock()
	session, exists := rm.sessions[cameraID]
	rm.mu.RUnlock()

	if !exists {
		return nil, fmt.Errorf("no active recording for camera %s", cameraID)
	}

	// Send SIGINT to let FFmpeg finalize the file (write moov atom / flush fragments)
	if session.Cmd != nil && session.Cmd.Process != nil {
		log.Info().Str("camera_id", cameraID).Msg("Sending SIGINT to FFmpeg for graceful stop")
		session.Cmd.Process.Signal(syscall.SIGINT)
	}

	// Wait for FFmpeg to finish gracefully (up to 15 seconds)
	select {
	case <-session.Done:
		// FFmpeg exited cleanly
	case <-time.After(15 * time.Second):
		// Force kill if it didn't stop in time
		log.Warn().Str("camera_id", cameraID).Msg("FFmpeg did not stop in time, force killing")
		if session.Cmd != nil && session.Cmd.Process != nil {
			session.Cmd.Process.Kill()
		}
		<-session.Done
	}

	// Clean up the cancel func
	session.Cancel()

	return session.Recording, nil
}

// StopAll stops all active recordings.
func (rm *RecordingManager) StopAll() {
	rm.mu.RLock()
	cameraIDs := make([]string, 0, len(rm.sessions))
	for id := range rm.sessions {
		cameraIDs = append(cameraIDs, id)
	}
	rm.mu.RUnlock()

	for _, id := range cameraIDs {
		rm.StopRecording(context.Background(), id)
	}
}

// IsRecording checks if a camera is currently being recorded.
func (rm *RecordingManager) IsRecording(cameraID string) bool {
	rm.mu.RLock()
	defer rm.mu.RUnlock()
	_, exists := rm.sessions[cameraID]
	return exists
}

// GetActiveRecordings returns all active recording sessions.
func (rm *RecordingManager) GetActiveRecordings() []*entities.Recording {
	rm.mu.RLock()
	defer rm.mu.RUnlock()
	result := make([]*entities.Recording, 0, len(rm.sessions))
	for _, s := range rm.sessions {
		result = append(result, s.Recording)
	}
	return result
}

func (rm *RecordingManager) removeSession(cameraID string) {
	rm.mu.Lock()
	delete(rm.sessions, cameraID)
	rm.mu.Unlock()
}

func (rm *RecordingManager) resolveOutputPath(relPath string) string {
	if rm.storageBackend.Mode() == "local" {
		return filepath.Join(rm.cfg.LocalStoragePath, relPath)
	}
	// For cloud backends, write to a temp directory first, then upload
	return filepath.Join(os.TempDir(), "vigileeye-recordings", relPath)
}
