# VigileEye Storage Backend (Go)

High-performance video footage storage microservice for the VigileEye surveillance system.

## Architecture

```
StorageBackend/
├── cmd/server/main.go           # Entry point
├── internal/
│   ├── api/
│   │   ├── middleware/          # Auth, error handler, logger
│   │   └── routes/              # HTTP handlers (REST API)
│   ├── application/
│   │   ├── dto/                 # Request/response DTOs
│   │   └── usecases/            # Business logic
│   ├── domain/
│   │   ├── entities/            # Recording, StorageConfig, Camera, Metrics
│   │   ├── errors/              # Domain errors
│   │   ├── repositories/        # Repository interfaces
│   │   └── services/            # Service interfaces (StorageBackend, Auth, Camera)
│   └── infrastructure/
│       ├── config/              # Environment configuration
│       ├── external/            # Camera Management API client
│       ├── persistence/         # In-memory repos (pgx TODO)
│       ├── recording/           # FFmpeg recording manager + retention cleaner
│       ├── security/            # JWT auth
│       └── storage/             # Storage backends: LocalFS, MinIO, Azure (Strategy Pattern)
├── tests/
│   ├── unit/
│   └── integration/
├── diagrams/
├── Dockerfile
├── go.mod
└── .env.example
```

## Features

- **Recording**: Pull RTSP streams from MediaMTX via FFmpeg, segment into MP4 files (configurable duration)
- **Multi-Camera**: Concurrent recording via Goroutines, per-camera settings
- **Storage Backends** (Strategy Pattern):
  - **Local FS**: Free tier, saves to disk/SD
  - **MinIO**: Self-hosted S3-compatible storage
  - **Azure Blob**: Cloud storage (PRO subscription)
- **Retention Policies**: Auto-delete by age (days) or size quota (GB)
- **Quality Control**: Configurable bitrate/resolution per camera
- **Access Control**: JWT validation (shared with Auth service), signed download URLs
- **HTTP Range**: Seeking/streaming support for video playback
- **Metrics**: Storage usage per camera/user
- **Subscription**: Simulated billing (FREE/PRO tiers)

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Service health check |
| POST | `/api/v1/storage/recordings/start` | Start recording a camera |
| POST | `/api/v1/storage/recordings/stop` | Stop recording a camera |
| GET | `/api/v1/storage/recordings` | List recordings (filter by camera_id) |
| GET | `/api/v1/storage/recordings/:id` | Get recording details |
| DELETE | `/api/v1/storage/recordings/:id` | Delete a recording |
| GET | `/api/v1/storage/recordings/active` | List active recordings |
| GET | `/api/v1/storage/download/:id` | Download recording file |
| GET | `/api/v1/storage/stream/:id` | Stream recording (HTTP range) |
| GET | `/api/v1/storage/thumbnail/:id` | Get recording thumbnail |
| GET | `/api/v1/storage/settings/:cameraId` | Get camera storage settings |
| PUT | `/api/v1/storage/settings/:cameraId` | Update camera storage settings |
| GET | `/api/v1/storage/settings` | List all user storage settings |
| GET | `/api/v1/storage/metrics` | Get user storage metrics |
| GET | `/api/v1/storage/metrics/:cameraId` | Get camera storage metrics |
| PUT | `/api/v1/storage/subscription` | Update subscription tier |

## Quick Start

```bash
# Setup
cd StorageBackend
cp .env.example .env
# Edit .env with your settings

# Run locally
go run ./cmd/server

# Run with Docker
docker build -t storage-backend .
docker run -p 8004:8004 --env-file .env storage-backend
```

## Storage Modes

### Local (FREE)
```env
STORAGE_MODE=local
LOCAL_STORAGE_PATH=./data/recordings
```

### MinIO (PRO)
```env
STORAGE_MODE=minio
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=vigileeye-recordings
```

### Azure Blob (PRO)
```env
STORAGE_MODE=azure
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;...
AZURE_CONTAINER_NAME=vigileeye-recordings
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 8004 | Server port |
| JWT_SECRET | (shared) | JWT secret for auth |
| DATABASE_URL | | PostgreSQL connection string |
| STORAGE_MODE | local | local/minio/azure |
| LOCAL_STORAGE_PATH | ./data/recordings | Local storage path |
| SEGMENT_DURATION_MINUTES | 10 | Recording segment duration |
| DEFAULT_RETENTION_DAYS | 7 | Days to keep recordings |
| DEFAULT_QUOTA_GB | 10 | Storage quota per camera |
| CAMERA_SERVICE_URL | http://localhost:8002 | Camera Management API |
| MEDIAMTX_RTSP_URL | rtsp://localhost:8554 | MediaMTX RTSP URL |
| SUBSCRIPTION_TIER | FREE | Default tier (FREE/PRO) |
