# Video Streaming Backend (Node.js)

Production-ready video streaming service for VigileEye. Pulls RTSP/HTTP camera streams via FFmpeg and distributes JPEG frames to viewers via WebSocket (primary) and HTTP polling (fallback).

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  API Layer (Express + WebSocket)                            │
│  ├── REST: /api/v1/streams/*   (start/stop/status/frame)   │
│  └── WS:  /ws/stream/:id      (real-time binary JPEG)      │
├─────────────────────────────────────────────────────────────┤
│  Application Layer (Use Cases)                              │
│  ├── StartStream    ├── StopStream                          │
│  ├── GetStreamStatus└── ListActiveStreams                   │
├─────────────────────────────────────────────────────────────┤
│  Domain Layer (Entities, Errors, Ports)                     │
│  ├── StreamSession  ├── Camera                              │
│  └── Repository / Service interfaces                        │
├─────────────────────────────────────────────────────────────┤
│  Infrastructure Layer                                       │
│  ├── FFmpegProcess (RTSP → JPEG frames via child process)   │
│  ├── StreamManager (lifecycle, reconnect, fan-out)          │
│  ├── JwtAuthService (validates Auth service tokens)         │
│  ├── HttpCameraService (calls Camera Mgmt FastAPI)          │
│  └── InMemoryStreamSessionRepository                        │
└─────────────────────────────────────────────────────────────┘
```

## Ports
- **8003** — HTTP + WebSocket

## Integration Points
| Service | Port | Purpose |
|---------|------|---------|
| Auth Backend | 8000 | JWT validation (shared secret) |
| Camera Management | 8002 | Fetch camera details & stream URLs |
| Frontend | 3000 | WebSocket/HTTP frame consumer |

## Quick Start

```bash
npm install
npm run build
npm start           # production
npm run dev         # development with hot-reload
npm test            # run unit tests
```

## API Endpoints

### REST (requires `Authorization: Bearer <token>`)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/streams/start` | Start streaming a camera |
| POST | `/api/v1/streams/stop` | Stop streaming a camera |
| GET | `/api/v1/streams/status/:id` | Get stream status |
| GET | `/api/v1/streams/active` | List all active streams |
| GET | `/api/v1/streams/frame/:id` | Get latest JPEG frame (HTTP polling) |

### WebSocket

| Path | Description |
|------|-------------|
| `/ws/stream/:cameraId?token=<JWT>` | Real-time binary JPEG frames |
| `/ws/frames/:cameraId?token=<JWT>` | Same as above (alias) |

## Docker

```bash
# CPU (default)
docker build -t videostreaming .

# GPU (NVIDIA)
docker build -f Dockerfile.gpu -t videostreaming-gpu .

# Run
docker run -p 8003:8003 --env-file .env videostreaming
```

## Environment Variables

See `.env.example` for all options. Key variables:

- `JWT_SECRET_KEY` — Must match the Auth service
- `CAMERA_SERVICE_URL` — Camera Management backend URL  
- `FFMPEG_PATH` — Path to FFmpeg binary
- `DEFAULT_FPS` — Default frame rate (15)

## How Streaming Works

1. Client requests stream via REST (`POST /streams/start`) or auto-start via frame endpoint / WebSocket
2. Service fetches camera details (stream_url) from Camera Management service
3. FFmpeg child process pulls RTSP/HTTP stream, outputs MJPEG frames to stdout
4. StreamManager extracts individual JPEG frames from the FFmpeg output
5. Frames are distributed to all connected WebSocket viewers in real-time
6. HTTP polling endpoint serves the latest frame for fallback/thumbnails
7. Auto-reconnection with exponential backoff if camera disconnects

## Performance

- Sub-second latency via WebSocket binary frames
- One FFmpeg process per camera (shared across viewers)
- Automatic reconnection (configurable max attempts)
- Rate-limited API endpoints
- Graceful shutdown with stream cleanup
