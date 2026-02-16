# Camera Management Backend

FastAPI microservice for managing security cameras with Clean Architecture and SOLID principles.

## Features

- **Camera Lifecycle Management**: Create, update, delete, enable/disable cameras
- **Configuration Management**: Stream URL, protocol, resolution, FPS, encoding
- **Status & Health Monitoring**: Heartbeat tracking, latency, frame drop rate, uptime
- **Location Context**: Building, floor, zone, room, GPS coordinates
- **Access Control**: Permission-based camera sharing (view/manage)
- **JWT Integration**: Validates tokens from Auth service

## Architecture 

```
CameraManagementBackend/
├── api/                      # API Layer
│   ├── dependencies/         # Auth dependencies
│   └── routes/               # FastAPI routes
├── application/              # Application Layer
│   ├── dtos/                 # Request/Response DTOs
│   └── use_cases/            # Business use cases
├── domain/                   # Domain Layer
│   ├── entities/             # Domain entities
│   ├── exceptions.py         # Domain exceptions
│   └── repositories/         # Repository interfaces
├── infrastructure/           # Infrastructure Layer
│   ├── config/               # Settings
│   ├── persistence/          # Database, models, repos
│   └── security/             # JWT handler
└── alembic/                  # Database migrations
```

## Prerequisites

- Python 3.10+
- PostgreSQL 14+
- Auth Backend running on port 8000 (for JWT validation)

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

3. Create PostgreSQL database:
```sql
CREATE DATABASE "CMcamerasMgmt";
CREATE USER "cmCamerasMgmt" WITH PASSWORD 'CameraMgmt@admin';
GRANT ALL PRIVILEGES ON DATABASE "CMcamerasMgmt" TO "cmCamerasMgmt";
```

4. Copy `.env.example` to `.env` and configure:
```bash
cp .env.example .env
```

5. Run migrations:
```bash
alembic upgrade head
```

6. Start the server:
```bash
python main.py
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/api/v1/cameras` | Create a camera |
| GET | `/api/v1/cameras` | List user's cameras |
| GET | `/api/v1/cameras/{id}` | Get camera by ID |
| PUT | `/api/v1/cameras/{id}` | Update camera |
| DELETE | `/api/v1/cameras/{id}` | Delete camera |
| POST | `/api/v1/cameras/{id}/enable` | Enable camera |
| POST | `/api/v1/cameras/{id}/disable` | Disable camera |
| GET | `/api/v1/cameras/{id}/health` | Get camera health |
| POST | `/api/v1/cameras/{id}/heartbeat` | Record heartbeat |

## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| DATABASE_URL | PostgreSQL connection string | Required |
| JWT_SECRET | JWT signing secret (must match Auth service) | Required |
| JWT_ALGORITHM | JWT algorithm | HS256 |
| PORT | Server port | 8002 |

## Camera Types suppoeted

- `fixed` - Fixed position camera
- `ptz` - Pan-Tilt-Zoom camera
- `dome` - Dome camera
- `bullet` - Bullet camera
- `thermal` - Thermal imaging camera

## Camera Status

- `online` - Camera is streaming
- `offline` - Camera is not responding
- `maintenance` - Camera under maintenance
- `error` - Camera has an error

## Integration

This service integrates with:
- **Auth Backend (port 8000)**: JWT token validation
- **Members Backend (port 8001)**: Future camera sharing integration
