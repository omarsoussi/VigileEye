# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**VigileEye** — An intelligent real-time video surveillance and analysis system using Computer Vision (OpenCV + YOLO) for object detection, tracking, intrusion detection, and analytics. Microservices architecture with 4 FastAPI backends + 1 React/Ionic frontend.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Frontend (React 18 + Ionic + TypeScript)         Port 3000 │
│  Front/SecurityFront/                                       │
└───────┬──────────┬──────────┬──────────┬────────────────────┘
        │          │          │          │
   ┌────▼───┐ ┌───▼────┐ ┌──▼───┐ ┌───▼──────────┐
   │ Auth   │ │Members │ │Camera│ │Video         │
   │ 8000   │ │ 8001   │ │ 8002 │ │Streaming 8003│
   └────────┘ └────────┘ └──────┘ └──────────────┘
   Backend/   MembersIn-  Camera-   VideoStreaming-
              vitation-   Manage-   Backend/
              Backend/    ment-
                          Backend/
```

All backends: **Python 3.11 + FastAPI + SQLAlchemy + PostgreSQL (pg8000) + Alembic migrations**

### Clean Architecture (all backends follow this)

```
service/
├── api/routes/            # FastAPI endpoints
├── api/dependencies/      # Auth/JWT dependency injection
├── application/dtos/      # Pydantic request/response models
├── application/services/  # Business orchestration
├── application/use_cases/ # Business logic
├── domain/entities/       # Domain models
├── domain/repositories/   # Abstract repository interfaces
├── domain/value_objects/  # Email, Password, etc.
├── domain/exceptions.py   # Domain errors
├── infrastructure/config/ # Pydantic Settings (.env loading, @lru_cache)
├── infrastructure/persistence/  # SQLAlchemy models, DB repos, database.py
├── infrastructure/security/     # JWT, bcrypt, OTP
├── infrastructure/external/     # Email sender, OAuth, stream resolvers
├── alembic/               # DB migrations
├── tests/unit/            # Unit tests
├── tests/integration/     # Integration tests
├── main.py                # FastAPI app entry point
├── requirements.txt
├── Dockerfile
└── .env / .env.example
```

## Services

| Service | Dir | Port | Purpose |
|---------|-----|------|---------|
| Auth | `Backend/` | 8000 | Registration, login, 2FA (email OTP), JWT, Google OAuth, password reset |
| Members | `MembersInvitationBackend/` | 8001 | Camera sharing invitations, permissions (Reader/Editor) |
| Camera Mgmt | `CameraManagementBackend/` | 8002 | Camera CRUD, health monitoring, heartbeat, location |
| Video Streaming | `VideoStreamingBackend/` | 8003 | RTSP/HTTP stream ingestion, WebSocket delivery, OpenCV frame extraction |
| Frontend | `Front/SecurityFront/` | 3000 | React/Ionic hybrid (web + mobile via Capacitor) |

## Common Commands

### Backend (same pattern for all 4 services)

```bash
# Setup virtual env & install
cd Backend  # or CameraManagementBackend, etc.
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Run migrations
alembic upgrade head

# Run dev server
python main.py
# OR: uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Run tests (Backend/ has the most tests)
pytest                              # all tests
pytest tests/unit/                  # unit only
pytest tests/unit/test_password.py -v  # single file
pytest --cov=. --cov-report=html   # with coverage
```

### Frontend

```bash
cd Front/SecurityFront
npm install
npm start       # dev server on port 3000
npm run build   # production build
npm test        # run tests
```

### Docker (full stack)

```bash
docker-compose up -d    # start all services
docker-compose down     # stop all
```

## API Routes

- Auth: `/api/v1/auth/*` (register, verify, login, login/confirm, forgot-password, reset-password, refresh, google)
- Members: `/api/v1/members/invitations/*` (create, sent, received, accept, decline, resend-code)
- Cameras: `/api/v1/cameras/*` (CRUD, enable/disable, health, heartbeat)
- Streaming: `/api/v1/streams/*` (start, stop, status, active) + WebSocket `/ws/stream/{camera_id}` and `/ws/frames/{camera_id}`

## Key Technical Details

- **JWT** shared across services — Auth service issues tokens, other services validate with the same secret
- **Database driver**: pg8000 (pure Python, no psycopg2/libpq dependency)
- **Connection string format**: `postgresql+pg8000://user:pass@host:5432/dbname`
- **Settings pattern**: Pydantic `BaseSettings` with `SettingsConfigDict(env_file=".env")`, cached with `@lru_cache()`
- **Auth flow**: Register → Email OTP verification → Login → 2FA OTP confirmation → JWT (access + refresh)
- **Account lockout**: 3 failed login attempts = 1 hour lockout
- **Video pipeline**: Camera stream (RTSP/HTTP/HLS) → OpenCV capture → JPEG encoding → WebSocket broadcast
- **Frontend API config**: `REACT_APP_API_URL`, `REACT_APP_MEMBERS_API_URL`, `REACT_APP_CAMERAS_API_URL` in `.env`
- Each service has its own PostgreSQL database (separate DB per service)
