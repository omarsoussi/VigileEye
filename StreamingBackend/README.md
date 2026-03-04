# VigileEye Streaming Backend (Go)

High-performance real-time video streaming service using WebRTC (pion/webrtc) for ultra-low-latency camera streaming.

## Architecture

- **WebRTC SFU** — pion/webrtc TrackLocalStaticRTP for efficient RTP fan-out
- **FFmpeg** — Camera ingest (RTSP/HTTP → RTP H.264) + JPEG extraction for HTTP polling fallback
- **Clean Architecture** — Domain → Application → Infrastructure → API layers
- **HTTP-based signaling** — SDP offer/answer via REST (no WebSocket overhead)

## Quick Start

```bash
# Install Go 1.22+ and FFmpeg
# Copy and configure .env
cp .env.example .env

# Install dependencies
go mod tidy

# Run
go run ./cmd/server
```

## API Endpoints

### Streams

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/streams/start` | Start streaming a camera |
| POST | `/api/v1/streams/stop` | Stop streaming a camera |
| GET | `/api/v1/streams/status/:cameraId` | Get stream status |
| GET | `/api/v1/streams/active` | List all active streams |
| GET | `/api/v1/streams/realtime/:cameraId` | Real-time stats |
| GET | `/api/v1/streams/frame/:cameraId` | Latest JPEG frame |
| GET | `/api/v1/streams/ice-servers` | ICE server config |
| POST | `/api/v1/streams/probe` | Probe a stream URL |

### WebRTC Signaling

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/webrtc/offer` | Send SDP offer → receive SDP answer |
| POST | `/api/v1/webrtc/ice-candidate` | Trickle ICE candidate |
| POST | `/api/v1/webrtc/disconnect` | Disconnect viewer |

### Health

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Service health check |

## Environment Variables

See `.env.example` for all configuration options.

## Docker

```bash
docker build -t vigileye-streaming .
docker run -p 8003:8003 -p 50000-50100:50000-50100/udp --env-file .env vigileye-streaming
```

## Tests

```bash
go test ./... -v
go test ./tests/unit/... -v
go test ./tests/integration/... -v
go test ./... -cover
```

## Project Structure

```
StreamingBackend/
├── cmd/server/main.go           # Entry point
├── internal/
│   ├── api/
│   │   ├── middleware/          # Auth, error handler, logger
│   │   └── routes/             # HTTP handlers
│   ├── application/
│   │   ├── dto/                # Request/response DTOs
│   │   └── usecases/           # Business logic
│   ├── domain/
│   │   ├── entities/           # Domain models
│   │   ├── errors/             # Domain errors
│   │   ├── repositories/       # Abstract interfaces
│   │   └── services/           # Service interfaces
│   └── infrastructure/
│       ├── config/             # Environment configuration
│       ├── external/           # HTTP client to Camera Management
│       ├── persistence/        # In-memory repositories
│       ├── security/           # JWT validation
│       └── streaming/          # FFmpeg + WebRTC pipeline
├── tests/
│   ├── unit/                   # Unit tests
│   └── integration/            # Integration tests
├── diagrams/                   # UML diagrams
├── Dockerfile
├── go.mod
└── .env.example
```
