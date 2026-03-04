package streaming

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"os/exec"
	"strings"
	"sync"
	"time"

	"github.com/rs/zerolog/log"
	"github.com/vigileye/streaming-backend/internal/infrastructure/config"
)

// FFmpegProcess manages an FFmpeg child process that extracts JPEG frames
// from an RTSP/HTTP camera stream via stdout.
type FFmpegProcess struct {
	mu      sync.Mutex
	cmd     *exec.Cmd
	cancel  context.CancelFunc
	running bool

	// OnFrame is called for each complete JPEG frame extracted.
	OnFrame func(frame []byte)
	// OnClose is called when FFmpeg exits.
	OnClose func(code int)
	// OnError is called on errors.
	OnError func(err error)
}

// NewFFmpegProcess creates a new FFmpeg process wrapper.
func NewFFmpegProcess() *FFmpegProcess {
	return &FFmpegProcess{}
}

// FFmpegOptions configures the FFmpeg extraction.
type FFmpegOptions struct {
	StreamURL string
	FPS       int
	Width     int
	Height    int
	FFmpegBin string
}

// Start spawns FFmpeg to extract MJPEG frames from the stream.
func (f *FFmpegProcess) Start(opts FFmpegOptions) error {
	f.mu.Lock()
	defer f.mu.Unlock()

	if f.running {
		return nil
	}

	ctx, cancel := context.WithCancel(context.Background())
	f.cancel = cancel

	args := buildFFmpegArgs(opts)
	if opts.FFmpegBin == "" {
		opts.FFmpegBin = "ffmpeg"
	}

	cmd := exec.CommandContext(ctx, opts.FFmpegBin, args...)
	f.cmd = cmd

	stdout, err := cmd.StdoutPipe()
	if err != nil {
		cancel()
		return fmt.Errorf("stdout pipe: %w", err)
	}

	stderr, err := cmd.StderrPipe()
	if err != nil {
		cancel()
		return fmt.Errorf("stderr pipe: %w", err)
	}

	if err := cmd.Start(); err != nil {
		cancel()
		return fmt.Errorf("start ffmpeg: %w", err)
	}

	f.running = true
	log.Info().Str("stream_url", opts.StreamURL).Msg("FFmpeg JPEG extraction started")

	// Read stderr for errors
	go func() {
		scanner := bufio.NewScanner(stderr)
		for scanner.Scan() {
			line := scanner.Text()
			if containsError(line) {
				log.Error().Str("ffmpeg", line).Msg("FFmpeg error")
			}
		}
	}()

	// Extract JPEG frames from stdout
	go func() {
		defer func() {
			f.mu.Lock()
			f.running = false
			f.mu.Unlock()
		}()

		buf := make([]byte, 0, 512*1024) // 512KB initial buffer
		readBuf := make([]byte, 32*1024)  // 32KB read chunks

		for {
			n, err := stdout.Read(readBuf)
			if n > 0 {
				buf = append(buf, readBuf[:n]...)
				buf = f.extractFrames(buf)
			}
			if err != nil {
				break
			}
		}

		exitCode := 0
		if err := cmd.Wait(); err != nil {
			if exitErr, ok := err.(*exec.ExitError); ok {
				exitCode = exitErr.ExitCode()
			}
		}

		if f.OnClose != nil {
			f.OnClose(exitCode)
		}
	}()

	return nil
}

// Stop terminates the FFmpeg process.
func (f *FFmpegProcess) Stop() {
	f.mu.Lock()
	defer f.mu.Unlock()

	if !f.running || f.cancel == nil {
		return
	}

	f.cancel()
	f.running = false

	// Force kill after 3s
	if f.cmd != nil && f.cmd.Process != nil {
		go func() {
			time.Sleep(3 * time.Second)
			if f.cmd != nil && f.cmd.Process != nil {
				_ = f.cmd.Process.Kill()
			}
		}()
	}
}

// IsRunning returns whether FFmpeg is currently running.
func (f *FFmpegProcess) IsRunning() bool {
	f.mu.Lock()
	defer f.mu.Unlock()
	return f.running
}

// extractFrames finds complete JPEG frames (SOI to EOI) in the buffer.
func (f *FFmpegProcess) extractFrames(buf []byte) []byte {
	soiMarker := []byte{0xFF, 0xD8}
	eoiMarker := []byte{0xFF, 0xD9}

	for {
		soiIdx := indexOf(buf, soiMarker)
		if soiIdx == -1 {
			return buf[:0]
		}

		eoiIdx := indexOf(buf[soiIdx+2:], eoiMarker)
		if eoiIdx == -1 {
			// Incomplete frame — keep from SOI onward
			if soiIdx > 0 {
				return buf[soiIdx:]
			}
			return buf
		}

		eoiIdx += soiIdx + 2 // adjust to absolute index
		frame := make([]byte, eoiIdx+2-soiIdx)
		copy(frame, buf[soiIdx:eoiIdx+2])

		if f.OnFrame != nil {
			f.OnFrame(frame)
		}

		buf = buf[eoiIdx+2:]
	}
}

func indexOf(data, pattern []byte) int {
	for i := 0; i <= len(data)-len(pattern); i++ {
		if data[i] == pattern[0] && data[i+1] == pattern[1] {
			return i
		}
	}
	return -1
}

func containsError(line string) bool {
	lower := strings.ToLower(line)
	return strings.Contains(lower, "error") ||
		strings.Contains(lower, "fatal") ||
		strings.Contains(lower, "fail")
}

func buildFFmpegArgs(opts FFmpegOptions) []string {
	var args []string

	// Low-latency input tuning
	args = append(args,
		"-fflags", "+nobuffer+genpts",
		"-flags", "low_delay",
		"-max_delay", "0",
		"-analyzeduration", "500000",
		"-probesize", "500000",
	)

	lower := strings.ToLower(opts.StreamURL)

	// File-like inputs need real-time pacing
	isFile := !strings.Contains(lower, "://") ||
		strings.HasPrefix(lower, "file:") ||
		strings.HasSuffix(lower, ".mp4") ||
		strings.HasSuffix(lower, ".mkv")
	if isFile {
		args = append(args, "-re")
	}

	// Protocol-specific flags
	if strings.HasPrefix(lower, "rtsp://") {
		args = append(args, "-rtsp_transport", "tcp", "-stimeout", "5000000")
	}
	if strings.HasPrefix(lower, "http://") || strings.HasPrefix(lower, "https://") {
		args = append(args, "-reconnect", "1", "-reconnect_streamed", "1", "-reconnect_delay_max", "5")
	}

	args = append(args, "-i", opts.StreamURL)

	// Output MJPEG frames to stdout
	args = append(args,
		"-f", "image2pipe",
		"-vcodec", "mjpeg",
		"-q:v", "5",
		"-vf", fmt.Sprintf("fps=%d,scale=%d:%d:flags=fast_bilinear", opts.FPS, opts.Width, opts.Height),
		"-vsync", "0",
		"-fflags", "nobuffer",
		"-an",
		"pipe:1",
	)

	return args
}

// BuildRTPArgs builds FFmpeg arguments for RTP output (WebRTC ingest via pion).
func BuildRTPArgs(cfg *config.Config, streamURL string, rtpPort int, fps, width, height int) []string {
	var args []string

	args = append(args,
		"-fflags", "+nobuffer+genpts",
		"-flags", "low_delay",
		"-analyzeduration", "500000",
		"-probesize", "500000",
	)

	lower := strings.ToLower(streamURL)
	isFile := !strings.Contains(lower, "://") ||
		strings.HasPrefix(lower, "file:")
	if isFile {
		args = append(args, "-re")
	}
	if strings.HasPrefix(lower, "rtsp://") {
		args = append(args, "-rtsp_transport", "tcp", "-stimeout", "5000000")
	}
	if strings.HasPrefix(lower, "http://") || strings.HasPrefix(lower, "https://") {
		args = append(args, "-reconnect", "1", "-reconnect_streamed", "1", "-reconnect_delay_max", "5")
	}

	args = append(args, "-i", streamURL)

	// H.264 passthrough → RTP
	args = append(args,
		"-an",
		"-c:v", "copy",
		"-f", "rtp",
		"-payload_type", "96",
		"-ssrc", "1111",
		fmt.Sprintf("rtp://127.0.0.1:%d?pkt_size=1200", rtpPort),
	)

	return args
}

// BuildTranscodeRTPArgs builds FFmpeg args for transcoding non-H.264 to H.264 RTP.
func BuildTranscodeRTPArgs(cfg *config.Config, streamURL string, rtpPort, fps, w, h int) []string {
	var args []string

	args = append(args,
		"-fflags", "+nobuffer+genpts",
		"-flags", "low_delay",
		"-analyzeduration", "500000",
		"-probesize", "500000",
	)

	lower := strings.ToLower(streamURL)
	if strings.HasPrefix(lower, "rtsp://") {
		args = append(args, "-rtsp_transport", "tcp", "-stimeout", "5000000")
	}
	args = append(args, "-i", streamURL)

	args = append(args,
		"-an",
		"-c:v", "libx264",
		"-preset", "ultrafast",
		"-tune", "zerolatency",
		"-profile:v", "baseline",
		"-level", "3.1",
		"-b:v", "2000k",
		"-maxrate", "2500k",
		"-bufsize", "4000k",
		"-g", fmt.Sprintf("%d", fps*2),
		"-vf", fmt.Sprintf("fps=%d,scale=%d:%d", fps, w, h),
		"-f", "rtp",
		"-payload_type", "96",
		"-ssrc", "1111",
		fmt.Sprintf("rtp://127.0.0.1:%d?pkt_size=1200", rtpPort),
	)

	return args
}

// ProbeResult contains stream probe information.
type ProbeResult struct {
	Reachable       bool   `json:"reachable"`
	HasVideo        bool   `json:"has_video"`
	HasAudio        bool   `json:"has_audio"`
	VideoCodec      string `json:"video_codec,omitempty"`
	AudioCodec      string `json:"audio_codec,omitempty"`
	AudioSampleRate int    `json:"audio_sample_rate,omitempty"`
	AudioChannels   int    `json:"audio_channels,omitempty"`
	Width           int    `json:"width,omitempty"`
	Height          int    `json:"height,omitempty"`
	FPS             int    `json:"fps,omitempty"`
}

// ProbeStream uses ffprobe to check stream reachability and metadata.
func ProbeStream(ffprobePath, streamURL string) (*ProbeResult, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 8*time.Second)
	defer cancel()

	args := []string{
		"-v", "quiet",
		"-print_format", "json",
		"-show_streams",
		"-show_format",
		"-timeout", "5000000",
	}

	lower := strings.ToLower(streamURL)
	if strings.HasPrefix(lower, "rtsp://") {
		args = append(args, "-rtsp_transport", "tcp")
	}
	args = append(args, streamURL)

	cmd := exec.CommandContext(ctx, ffprobePath, args...)
	output, err := cmd.Output()
	if err != nil {
		return &ProbeResult{Reachable: false}, nil
	}

	// Parse JSON output (simplified)
	type streamInfo struct {
		CodecType  string `json:"codec_type"`
		CodecName  string `json:"codec_name"`
		Width      int    `json:"width"`
		Height     int    `json:"height"`
		RFrameRate string `json:"r_frame_rate"`
		SampleRate string `json:"sample_rate"`
		Channels   int    `json:"channels"`
	}
	type probeOutput struct {
		Streams []streamInfo `json:"streams"`
	}

	var parsed probeOutput
	if err := parseJSON(output, &parsed); err != nil {
		return &ProbeResult{Reachable: true}, nil
	}

	result := &ProbeResult{Reachable: true}
	for _, s := range parsed.Streams {
		if s.CodecType == "video" {
			result.HasVideo = true
			result.VideoCodec = s.CodecName
			result.Width = s.Width
			result.Height = s.Height
			result.FPS = parseFrameRate(s.RFrameRate)
		}
		if s.CodecType == "audio" {
			result.HasAudio = true
			result.AudioCodec = s.CodecName
			result.AudioChannels = s.Channels
			if sr := parseInt(s.SampleRate); sr > 0 {
				result.AudioSampleRate = sr
			}
		}
	}

	return result, nil
}

func parseJSON(data []byte, v interface{}) error {
	return json.Unmarshal(data, v)
}

func parseFrameRate(rate string) int {
	parts := strings.Split(rate, "/")
	if len(parts) != 2 {
		return parseInt(rate)
	}
	num := parseInt(parts[0])
	den := parseInt(parts[1])
	if den == 0 {
		return num
	}
	return num / den
}

func parseInt(s string) int {
	n := 0
	for _, c := range s {
		if c >= '0' && c <= '9' {
			n = n*10 + int(c-'0')
		}
	}
	return n
}
