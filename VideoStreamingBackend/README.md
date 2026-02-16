# Video Streaming Service — VigileEye

Real-time video streaming microservice for the VigileEye security platform.

## Overview

The Video Streaming Service handles:
- Ingesting live video streams from cameras (RTSP/HTTP)
- Managing stream sessions
- Extracting and encoding frames
- Delivering real-time video via WebSocket to frontend and AI services

## Architecture

```
Camera Mgmt Service
       |
       |  (stream_url)
       v
Video Streaming Service (port 8003)
       |              |
       | frames       | live frames
       v              v
AI Service        Frontend (WebSocket)
```

## API Endpoints

### REST (Control Plane)
- `POST /api/v1/streams/start` — Start a stream session
- `POST /api/v1/streams/stop` — Stop a stream session
- `GET /api/v1/streams/status/{camera_id}` — Get stream status
- `GET /api/v1/streams/active` — List active streams

### WebSocket (Data Plane)
- `/ws/stream/{camera_id}` — Live video frames (JPEG) for frontend
- `/ws/frames/{camera_id}` — Raw frames for AI service

## Setup

1. Create virtual environment:
```bash
python -m venv venv
source venv/bin/activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Configure environment:
```bash
cp .env.example .env
# Edit .env with your settings
```

4. Run database migrations:
```bash
alembic upgrade head
```

5. Start the server:
```bash
uvicorn main:app --host 0.0.0.0 --port 8003 --reload
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| DATABASE_URL | PostgreSQL connection string | - |
| JWT_SECRET | Must match Auth service | - |
| JWT_ALGORITHM | Token algorithm | HS256 |
| DEFAULT_FPS | Default frames per second | 15 |
| FRAME_QUALITY | JPEG quality (1-100) | 85 |

## Technologies

- FastAPI (async REST + WebSocket)
- OpenCV (video decoding)
- SQLAlchemy + Alembic (persistence)
- WebSockets (real-time transport)
- JWT (authentication)
