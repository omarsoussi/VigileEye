package streaming

import (
	"context"
	"fmt"
	"net"
	"os/exec"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/pion/interceptor"
	"github.com/pion/webrtc/v4"
	"github.com/rs/zerolog/log"
	"github.com/vigileye/streaming-backend/internal/infrastructure/config"
)

// CameraIngest manages the FFmpeg→RTP→pion pipeline for one camera.
type CameraIngest struct {
	mu sync.RWMutex

	CameraID  string
	StreamURL string
	FPS       int
	Width     int
	Height    int
	Bitrate   int

	// When true, force FFmpeg to transcode to WebRTC-safe H.264 (baseline, no B-frames)
	TranscodeVideo bool

	// RTP listener (receives RTP from FFmpeg)
	rtpConn    *net.UDPConn
	rtpPort    int
	audioConn  *net.UDPConn
	audioPort  int
	ffmpegCmd  *exec.Cmd
	ffmpegStop context.CancelFunc

	// pion video track that all viewers subscribe to
	videoTrack *webrtc.TrackLocalStaticRTP
	// pion audio track that all viewers subscribe to
	audioTrack *webrtc.TrackLocalStaticRTP

	// Viewer peer connections
	viewers     map[string]*ViewerPeer
	viewerCount atomic.Int32

	// Stats
	frameCount  atomic.Int64
	lastFPSCalc time.Time
	currentFPS  atomic.Int32
	bitrate     atomic.Int64

	running atomic.Bool
	cfg     *config.Config
}

// ViewerPeer wraps a single WebRTC peer connection for a viewer.
type ViewerPeer struct {
	ID   string
	PC   *webrtc.PeerConnection
	Done chan struct{}
}

// NewCameraIngest creates a new camera ingest pipeline.
func NewCameraIngest(cameraID, streamURL string, fps, width, height, bitrate int, transcodeVideo bool, cfg *config.Config) *CameraIngest {
	return &CameraIngest{
		CameraID:       cameraID,
		StreamURL:      streamURL,
		FPS:            fps,
		Width:          width,
		Height:         height,
		Bitrate:        bitrate,
		TranscodeVideo: transcodeVideo,
		viewers:        make(map[string]*ViewerPeer),
		cfg:            cfg,
	}
}

// Start begins the camera ingest pipeline:
// 1. Creates a pion TrackLocalStaticRTP for H.264
// 2. Opens a UDP listener for RTP packets from FFmpeg
// 3. Spawns FFmpeg to send H.264 RTP to the listener
// 4. Forwards RTP packets to the track (all viewers receive them)
func (ci *CameraIngest) Start() error {
	if ci.running.Load() {
		return nil
	}

	// Create the video track that viewers will subscribe to.
	// Using H264 codec for maximum browser compatibility.
	videoTrack, err := webrtc.NewTrackLocalStaticRTP(
		webrtc.RTPCodecCapability{MimeType: webrtc.MimeTypeH264},
		fmt.Sprintf("video-%s", ci.CameraID),
		fmt.Sprintf("stream-%s", ci.CameraID),
	)
	if err != nil {
		return fmt.Errorf("create video track: %w", err)
	}
	ci.videoTrack = videoTrack

	// Create the audio track (Opus). If the source has no audio, the track will
	// simply be silent.
	audioTrack, err := webrtc.NewTrackLocalStaticRTP(
		webrtc.RTPCodecCapability{MimeType: webrtc.MimeTypeOpus},
		fmt.Sprintf("audio-%s", ci.CameraID),
		fmt.Sprintf("stream-%s", ci.CameraID),
	)
	if err != nil {
		return fmt.Errorf("create audio track: %w", err)
	}
	ci.audioTrack = audioTrack

	// Open UDP listener for video RTP from FFmpeg
	addr, err := net.ResolveUDPAddr("udp", "127.0.0.1:0")
	if err != nil {
		return fmt.Errorf("resolve udp: %w", err)
	}

	conn, err := net.ListenUDP("udp", addr)
	if err != nil {
		return fmt.Errorf("listen udp: %w", err)
	}
	ci.rtpConn = conn
	ci.rtpPort = conn.LocalAddr().(*net.UDPAddr).Port

	// Open UDP listener for audio RTP from FFmpeg
	audioAddr, err := net.ResolveUDPAddr("udp", "127.0.0.1:0")
	if err != nil {
		return fmt.Errorf("resolve udp (audio): %w", err)
	}
	audioConn, err := net.ListenUDP("udp", audioAddr)
	if err != nil {
		return fmt.Errorf("listen udp (audio): %w", err)
	}
	ci.audioConn = audioConn
	ci.audioPort = audioConn.LocalAddr().(*net.UDPAddr).Port

	log.Info().
		Str("camera_id", ci.CameraID).
		Int("rtp_port", ci.rtpPort).
		Int("audio_rtp_port", ci.audioPort).
		Msg("RTP listener started")

	// Start RTP→Track forwarding goroutines
	ci.running.Store(true)
	ci.lastFPSCalc = time.Now()
	go ci.forwardVideoRTP()
	go ci.forwardAudioRTP()

	// Start FFmpeg
	if err := ci.startFFmpeg(); err != nil {
		ci.Stop()
		return fmt.Errorf("start ffmpeg: %w", err)
	}

	// Start FPS calculator
	go ci.calcFPS()

	return nil
}

// forwardRTP reads RTP packets from the UDP connection and writes them to the
// pion video track for fan-out to all viewers.
func (ci *CameraIngest) forwardRTP() {
	ci.forwardVideoRTP()
}

// forwardVideoRTP reads video RTP packets and writes them to the pion video track.
func (ci *CameraIngest) forwardVideoRTP() {
	buf := make([]byte, 1500) // MTU-sized buffer

	for ci.running.Load() {
		_ = ci.rtpConn.SetReadDeadline(time.Now().Add(5 * time.Second))
		n, err := ci.rtpConn.Read(buf)
		if err != nil {
			if netErr, ok := err.(net.Error); ok && netErr.Timeout() {
				continue
			}
			if ci.running.Load() {
				log.Warn().Err(err).Str("camera_id", ci.CameraID).Msg("RTP read error")
			}
			break
		}

		if n > 0 {
			ci.frameCount.Add(1)
			ci.bitrate.Add(int64(n * 8))

			// Write to pion track — this fans out to all peer connections
			if _, err := ci.videoTrack.Write(buf[:n]); err != nil {
				if ci.running.Load() {
					log.Warn().Err(err).Str("camera_id", ci.CameraID).Msg("Track write error")
				}
			}
		}
	}
}

// forwardAudioRTP reads audio RTP packets and writes them to the pion audio track.
func (ci *CameraIngest) forwardAudioRTP() {
	buf := make([]byte, 1500)

	for ci.running.Load() {
		_ = ci.audioConn.SetReadDeadline(time.Now().Add(5 * time.Second))
		n, err := ci.audioConn.Read(buf)
		if err != nil {
			if netErr, ok := err.(net.Error); ok && netErr.Timeout() {
				continue
			}
			if ci.running.Load() {
				log.Warn().Err(err).Str("camera_id", ci.CameraID).Msg("Audio RTP read error")
			}
			break
		}

		if n > 0 {
			if _, err := ci.audioTrack.Write(buf[:n]); err != nil {
				if ci.running.Load() {
					log.Warn().Err(err).Str("camera_id", ci.CameraID).Msg("Audio track write error")
				}
			}
		}
	}
}

func (ci *CameraIngest) calcFPS() {
	ticker := time.NewTicker(2 * time.Second)
	defer ticker.Stop()

	var lastCount int64
	for ci.running.Load() {
		<-ticker.C
		if !ci.running.Load() {
			return
		}
		current := ci.frameCount.Load()
		elapsed := time.Since(ci.lastFPSCalc).Seconds()
		if elapsed > 0 {
			fps := float64(current-lastCount) / elapsed
			ci.currentFPS.Store(int32(fps))
			lastCount = current
			ci.lastFPSCalc = time.Now()
		}
		// Reset bitrate counter every interval
		ci.bitrate.Store(0)
	}
}

func (ci *CameraIngest) startFFmpeg() error {
	ctx, cancel := context.WithCancel(context.Background())
	ci.ffmpegStop = cancel

	var args []string
	if ci.TranscodeVideo {
		args = BuildTranscodeRTPArgsAV(ci.cfg, ci.StreamURL, ci.rtpPort, ci.audioPort, ci.FPS, ci.Width, ci.Height, ci.Bitrate)
	} else {
		args = BuildRTPArgs(ci.cfg, ci.StreamURL, ci.rtpPort, ci.audioPort, ci.FPS, ci.Width, ci.Height)
	}
	cmd := exec.CommandContext(ctx, ci.cfg.FFmpegPath, args...)

	log.Info().
		Str("camera_id", ci.CameraID).
		Str("cmd", fmt.Sprintf("%s %s", ci.cfg.FFmpegPath, strings.Join(args, " "))).
		Msg("Starting FFmpeg RTP ingest")

	stderr, err := cmd.StderrPipe()
	if err != nil {
		cancel()
		return err
	}

	if err := cmd.Start(); err != nil {
		cancel()
		return err
	}
	ci.ffmpegCmd = cmd

	// Log FFmpeg errors
	go func() {
		buf := make([]byte, 4096)
		for {
			n, err := stderr.Read(buf)
			if n > 0 {
				line := string(buf[:n])
				if containsError(line) {
					log.Error().Str("camera_id", ci.CameraID).Str("ffmpeg", line).Msg("FFmpeg error")
				}
			}
			if err != nil {
				break
			}
		}
	}()

	// Monitor FFmpeg exit for auto-reconnect
	go func() {
		err := cmd.Wait()
		if !ci.running.Load() {
			return // Intentional stop
		}
		exitCode := 0
		if err != nil {
			if exitErr, ok := err.(*exec.ExitError); ok {
				exitCode = exitErr.ExitCode()
			}
		}
		log.Warn().
			Str("camera_id", ci.CameraID).
			Int("exit_code", exitCode).
			Msg("FFmpeg exited, reconnecting...")

		time.Sleep(time.Duration(ci.cfg.ReconnectDelayMs) * time.Millisecond)
		if ci.running.Load() {
			_ = ci.startFFmpeg()
		}
	}()

	return nil
}

// Stop terminates the ingest pipeline and all viewer connections.
func (ci *CameraIngest) Stop() {
	if !ci.running.CompareAndSwap(true, false) {
		return
	}

	log.Info().Str("camera_id", ci.CameraID).Msg("Stopping camera ingest")

	// Stop FFmpeg
	if ci.ffmpegStop != nil {
		ci.ffmpegStop()
	}
	if ci.ffmpegCmd != nil && ci.ffmpegCmd.Process != nil {
		_ = ci.ffmpegCmd.Process.Kill()
	}

	// Close RTP listener
	if ci.rtpConn != nil {
		_ = ci.rtpConn.Close()
	}
	if ci.audioConn != nil {
		_ = ci.audioConn.Close()
	}

	// Close all viewer peer connections
	ci.mu.Lock()
	for id, vp := range ci.viewers {
		_ = vp.PC.Close()
		close(vp.Done)
		delete(ci.viewers, id)
	}
	ci.mu.Unlock()
}

// AddViewer creates a new WebRTC PeerConnection for a viewer.
// Returns the SDP answer and the viewer ID.
func (ci *CameraIngest) AddViewer(viewerID string, offer webrtc.SessionDescription) (*webrtc.SessionDescription, error) {
	// Create MediaEngine for H264
	m := &webrtc.MediaEngine{}
	if err := m.RegisterCodec(webrtc.RTPCodecParameters{
		RTPCodecCapability: webrtc.RTPCodecCapability{
			MimeType:    webrtc.MimeTypeH264,
			ClockRate:   90000,
			SDPFmtpLine: "level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=42e01f",
		},
		PayloadType: 96,
	}, webrtc.RTPCodecTypeVideo); err != nil {
		return nil, fmt.Errorf("register codec: %w", err)
	}

	// Register Opus for audio (WebRTC standard)
	if err := m.RegisterCodec(webrtc.RTPCodecParameters{
		RTPCodecCapability: webrtc.RTPCodecCapability{
			MimeType:  webrtc.MimeTypeOpus,
			ClockRate: 48000,
			Channels:  2,
		},
		PayloadType: 111,
	}, webrtc.RTPCodecTypeAudio); err != nil {
		return nil, fmt.Errorf("register audio codec: %w", err)
	}

	// Create interceptor registry for RTCP feedback (PLI, NACK, etc.)
	i := &interceptor.Registry{}
	if err := webrtc.RegisterDefaultInterceptors(m, i); err != nil {
		return nil, fmt.Errorf("register interceptors: %w", err)
	}

	api := webrtc.NewAPI(webrtc.WithMediaEngine(m), webrtc.WithInterceptorRegistry(i))

	// ICE servers configuration
	iceServers := []webrtc.ICEServer{
		{URLs: []string{ci.cfg.STUNServer}},
	}
	if ci.cfg.TURNServer != "" {
		iceServers = append(iceServers, webrtc.ICEServer{
			URLs:       []string{ci.cfg.TURNServer},
			Username:   ci.cfg.TURNUsername,
			Credential: ci.cfg.TURNCredential,
		})
	}

	pc, err := api.NewPeerConnection(webrtc.Configuration{
		ICEServers:   iceServers,
		SDPSemantics: webrtc.SDPSemanticsUnifiedPlan,
	})
	if err != nil {
		return nil, fmt.Errorf("create peer connection: %w", err)
	}

	// Add the video track to the peer connection
	rtpSender, err := pc.AddTrack(ci.videoTrack)
	if err != nil {
		_ = pc.Close()
		return nil, fmt.Errorf("add track: %w", err)
	}

	// Add the audio track to the peer connection
	audioSender, err := pc.AddTrack(ci.audioTrack)
	if err != nil {
		_ = pc.Close()
		return nil, fmt.Errorf("add audio track: %w", err)
	}

	// Read RTCP packets (PLI, NACK, etc.) — required for pion
	go func() {
		buf := make([]byte, 1500)
		for {
			if _, _, err := rtpSender.Read(buf); err != nil {
				return
			}
		}
	}()

	go func() {
		buf := make([]byte, 1500)
		for {
			if _, _, err := audioSender.Read(buf); err != nil {
				return
			}
		}
	}()

	// Set up connection state monitoring
	done := make(chan struct{})
	vp := &ViewerPeer{
		ID:   viewerID,
		PC:   pc,
		Done: done,
	}

	pc.OnICEConnectionStateChange(func(state webrtc.ICEConnectionState) {
		log.Debug().
			Str("camera_id", ci.CameraID).
			Str("viewer_id", viewerID).
			Str("state", state.String()).
			Msg("ICE connection state changed")

		if state == webrtc.ICEConnectionStateFailed ||
			state == webrtc.ICEConnectionStateDisconnected ||
			state == webrtc.ICEConnectionStateClosed {
			ci.RemoveViewer(viewerID)
		}
	})

	// Set remote description (viewer's offer)
	if err := pc.SetRemoteDescription(offer); err != nil {
		_ = pc.Close()
		return nil, fmt.Errorf("set remote description: %w", err)
	}

	// Create answer
	answer, err := pc.CreateAnswer(nil)
	if err != nil {
		_ = pc.Close()
		return nil, fmt.Errorf("create answer: %w", err)
	}

	// Set local description
	if err := pc.SetLocalDescription(answer); err != nil {
		_ = pc.Close()
		return nil, fmt.Errorf("set local description: %w", err)
	}

	// Wait for ICE gathering to complete
	gatherComplete := webrtc.GatheringCompletePromise(pc)
	<-gatherComplete

	// Store the viewer
	ci.mu.Lock()
	ci.viewers[viewerID] = vp
	ci.viewerCount.Add(1)
	ci.mu.Unlock()

	localDesc := pc.LocalDescription()
	log.Info().
		Str("camera_id", ci.CameraID).
		Str("viewer_id", viewerID).
		Msg("Viewer WebRTC peer connected")

	return localDesc, nil
}

// RemoveViewer closes and removes a viewer peer connection.
func (ci *CameraIngest) RemoveViewer(viewerID string) {
	ci.mu.Lock()
	vp, ok := ci.viewers[viewerID]
	if ok {
		delete(ci.viewers, viewerID)
		ci.viewerCount.Add(-1)
	}
	ci.mu.Unlock()

	if ok && vp != nil {
		_ = vp.PC.Close()
		select {
		case <-vp.Done:
		default:
			close(vp.Done)
		}
		log.Info().
			Str("camera_id", ci.CameraID).
			Str("viewer_id", viewerID).
			Msg("Viewer disconnected")
	}
}

// AddICECandidate adds an ICE candidate to a viewer's peer connection.
func (ci *CameraIngest) AddICECandidate(viewerID string, candidate webrtc.ICECandidateInit) error {
	ci.mu.RLock()
	vp, ok := ci.viewers[viewerID]
	ci.mu.RUnlock()

	if !ok {
		return fmt.Errorf("viewer %s not found", viewerID)
	}

	return vp.PC.AddICECandidate(candidate)
}

// ViewerCount returns the number of active viewers.
func (ci *CameraIngest) ViewerCount() int {
	return int(ci.viewerCount.Load())
}

// GetStats returns current ingest statistics.
func (ci *CameraIngest) GetStats() (fps int, bitrate int64, viewers int) {
	return int(ci.currentFPS.Load()), ci.bitrate.Load(), ci.ViewerCount()
}

// IsRunning returns whether the ingest is active.
func (ci *CameraIngest) IsRunning() bool {
	return ci.running.Load()
}
