# Camera Management Service - VigileEye

## Overview

The **Camera Management Service** handles all camera-related operations for the VigileEye security platform. It provides CRUD operations for cameras, access control management, health monitoring, and user-specific camera listings.

**Port:** `8002`  
**Base URL:** `/api/v1`

---

## Architecture

The service follows **Clean Architecture** principles with clear layer separation:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              API Layer                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │                     camera_routes.py                                 ││
│  │                     /api/v1/cameras/*                                ││
│  └─────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼─────────────────────────────────────┐
│                         Application Layer                                │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                     CameraService (Facade)                         │  │
│  │  - create_camera()      - update_camera()     - delete_camera()   │  │
│  │  - get_camera()         - enable_camera()     - disable_camera()  │  │
│  │  - list_user_cameras()  - record_health()                         │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────┐  ┌───────────────────┐                       │
│  │     Use Cases         │  │      DTOs         │                       │
│  │  - CreateCamera       │  │  - CameraRequest  │                       │
│  │  - GetCamera          │  │  - CameraResponse │                       │
│  │  - UpdateCamera       │  │  - HealthRequest  │                       │
│  │  - DeleteCamera       │  │  - HealthResponse │                       │
│  │  - EnableCamera       │  │  - ListResponse   │                       │
│  │  - DisableCamera      │  └───────────────────┘                       │
│  │  - RecordHealth       │                                              │
│  │  - ListUserCameras    │                                              │
│  └───────────────────────┘                                              │
└───────────────────────────────────┼─────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼─────────────────────────────────────┐
│                           Domain Layer                                   │
│  ┌────────────────────┐  ┌─────────────────────┐  ┌──────────────────┐  │
│  │     Entities       │  │     Enums           │  │   Repositories   │  │
│  │  - Camera          │  │  - CameraStatus     │  │  - CameraRepo    │  │
│  │  - CameraAccess    │  │  - CameraType       │  │  - AccessRepo    │  │
│  │  - CameraHealth    │  │  - CameraLocation   │  │  - HealthRepo    │  │
│  │                    │  │  - AccessPermission │  │                  │  │
│  └────────────────────┘  └─────────────────────┘  └──────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                     Domain Exceptions                             │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└───────────────────────────────────┼─────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼─────────────────────────────────────┐
│                       Infrastructure Layer                               │
│  ┌──────────────┐  ┌────────────────┐  ┌─────────────────────────────┐  │
│  │   Config     │  │   Persistence  │  │        Security             │  │
│  │ - settings   │  │  - database    │  │  - JWT validation           │  │
│  └──────────────┘  │  - models      │  │  (shares secret with auth)  │  │
│                    │  - mappers     │  └─────────────────────────────┘  │
│                    │  - repos       │                                    │
│                    └────────────────┘                                    │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## File Structure

```
CameraManagementBackend/
├── main.py                          # FastAPI entry point
├── alembic.ini                      # Database migrations config
├── requirements.txt                 # Python dependencies
│
├── api/                             # API Layer
│   ├── __init__.py
│   ├── routes/
│   │   ├── __init__.py
│   │   └── camera_routes.py         # All camera endpoints
│   └── dependencies/
│       ├── __init__.py
│       └── auth_deps.py             # JWT authentication
│
├── application/                     # Application Layer
│   ├── __init__.py
│   ├── services/
│   │   ├── __init__.py
│   │   └── camera_service.py        # Facade orchestrating use cases
│   ├── use_cases/
│   │   ├── __init__.py
│   │   ├── create_camera.py         # Create new camera
│   │   ├── get_camera.py            # Get camera by ID
│   │   ├── update_camera.py         # Update camera info
│   │   ├── delete_camera.py         # Delete camera
│   │   ├── enable_camera.py         # Enable camera
│   │   ├── disable_camera.py        # Disable camera
│   │   ├── record_health.py         # Record health metrics
│   │   └── list_user_cameras.py     # List cameras for user
│   └── dtos/
│       ├── __init__.py
│       ├── camera_requests.py       # Request validation models
│       └── camera_responses.py      # Response models
│
├── domain/                          # Domain Layer
│   ├── __init__.py
│   ├── exceptions.py                # Domain exceptions
│   ├── entities/
│   │   ├── __init__.py
│   │   ├── camera.py                # Camera entity + enums
│   │   ├── camera_access.py         # Access permissions entity
│   │   └── camera_health.py         # Health metrics entity
│   └── repositories/
│       ├── __init__.py
│       ├── camera_repository.py     # Camera repository interface
│       ├── camera_access_repository.py
│       └── camera_health_repository.py
│
├── infrastructure/                  # Infrastructure Layer
│   ├── __init__.py
│   ├── config/
│   │   ├── __init__.py
│   │   └── settings.py              # Application settings
│   ├── security/
│   │   ├── __init__.py
│   │   └── jwt_handler.py           # JWT validation only
│   └── persistence/
│       ├── __init__.py
│       ├── database.py              # SQLAlchemy setup
│       ├── models/
│       │   ├── __init__.py
│       │   ├── camera_model.py
│       │   ├── camera_access_model.py
│       │   └── camera_health_model.py
│       ├── mappers/
│       │   ├── __init__.py
│       │   ├── camera_mapper.py
│       │   ├── camera_access_mapper.py
│       │   └── camera_health_mapper.py
│       └── repositories/
│           ├── __init__.py
│           ├── camera_repository_impl.py
│           ├── camera_access_repository_impl.py
│           └── camera_health_repository_impl.py
│
└── alembic/                         # Database migrations
    ├── env.py
    └── versions/
```

---

## Domain Layer

### Entities

#### Camera Entity (`domain/entities/camera.py`)

The core camera entity with all camera-related data.

```python
class CameraStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    MAINTENANCE = "maintenance"
    ERROR = "error"
    OFFLINE = "offline"

class CameraType(str, Enum):
    IP_CAMERA = "ip_camera"
    USB_CAMERA = "usb_camera"
    WEBCAM = "webcam"
    DVR = "dvr"
    NVR = "nvr"

class CameraLocation(str, Enum):
    INDOOR = "indoor"
    OUTDOOR = "outdoor"
    ENTRANCE = "entrance"
    PARKING = "parking"
    OTHER = "other"

@dataclass
class Camera:
    id: UUID
    owner_id: UUID                    # User who created the camera
    name: str                         # Display name
    description: Optional[str]
    stream_url: str                   # RTSP/RTMP/HTTP stream URL
    camera_type: CameraType
    location: CameraLocation
    status: CameraStatus
    is_enabled: bool
    is_recording: bool
    resolution: Optional[str]         # e.g., "1920x1080"
    fps: Optional[int]                # Frames per second
    codec: Optional[str]              # e.g., "H.264", "H.265"
    username: Optional[str]           # Stream authentication
    password: Optional[str]           # Stream authentication
    thumbnail_url: Optional[str]
    last_online: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    def enable(self) -> None
    def disable(self) -> None
    def update_status(self, status: CameraStatus) -> None
    def update_last_online(self) -> None
    def is_active(self) -> bool
    def validate(self) -> None         # Business rule validation
```

#### CameraAccess Entity (`domain/entities/camera_access.py`)

Manages who can access which cameras and with what permissions.

```python
class AccessPermission(str, Enum):
    VIEW = "view"           # Can only view stream
    MANAGE = "manage"       # Can view + change settings

@dataclass
class CameraAccess:
    id: UUID
    camera_id: UUID
    user_id: UUID
    permission: AccessPermission
    granted_by: UUID                  # Who granted this access
    granted_at: datetime
    expires_at: Optional[datetime]
    is_active: bool
    created_at: datetime
    updated_at: datetime

    def can_view(self) -> bool
    def can_manage(self) -> bool
    def is_expired(self) -> bool
    def revoke(self) -> None
    def grant(self) -> None
    def is_valid(self) -> bool         # Active and not expired
```

#### CameraHealth Entity (`domain/entities/camera_health.py`)

Tracks camera health metrics over time.

```python
@dataclass
class CameraHealth:
    id: UUID
    camera_id: UUID
    timestamp: datetime
    is_reachable: bool
    latency_ms: Optional[float]        # Response time
    packet_loss_percent: Optional[float]
    fps_actual: Optional[float]        # Actual vs configured FPS
    bitrate_kbps: Optional[float]
    resolution_actual: Optional[str]
    cpu_usage_percent: Optional[float] # If camera reports it
    memory_usage_percent: Optional[float]
    temperature_celsius: Optional[float]
    error_message: Optional[str]
    created_at: datetime

    def is_healthy(self) -> bool
    def has_performance_issues(self) -> bool
    def to_dict(self) -> dict
```

### Domain Exceptions (`domain/exceptions.py`)

| Exception | HTTP Status | Description |
|-----------|-------------|-------------|
| `CameraNotFoundException` | 404 | Camera not found |
| `CameraAccessDeniedException` | 403 | User lacks permission |
| `CameraAlreadyExistsException` | 409 | Duplicate camera name for user |
| `InvalidCameraDataException` | 400 | Invalid camera configuration |
| `CameraDisabledException` | 400 | Camera is disabled |
| `CameraOfflineException` | 503 | Camera is offline |
| `InvalidStreamUrlException` | 400 | Invalid stream URL format |
| `MaxCamerasExceededException` | 403 | User reached camera limit |

---

## Application Layer

### Use Cases

#### 1. CreateCamera (`application/use_cases/create_camera.py`)

**Input:** `CreateCameraRequest`, `owner_id`  
**Output:** `CameraResponse`

**Flow:**
1. Validate stream URL format
2. Check user hasn't exceeded camera limit
3. Check for duplicate camera name
4. Create Camera entity
5. Auto-grant MANAGE permission to owner
6. Save to database
7. Return camera response

---

#### 2. GetCamera (`application/use_cases/get_camera.py`)

**Input:** `camera_id`, `user_id`  
**Output:** `CameraResponse`

**Flow:**
1. Find camera by ID
2. Check user has VIEW or MANAGE permission
3. Return camera with health info if available

---

#### 3. UpdateCamera (`application/use_cases/update_camera.py`)

**Input:** `camera_id`, `UpdateCameraRequest`, `user_id`  
**Output:** `CameraResponse`

**Flow:**
1. Find camera by ID
2. Check user has MANAGE permission
3. Validate new values
4. Update entity fields
5. Save changes
6. Return updated camera

---

#### 4. DeleteCamera (`application/use_cases/delete_camera.py`)

**Input:** `camera_id`, `user_id`  
**Output:** `MessageResponse`

**Flow:**
1. Find camera by ID
2. Check user is owner (only owner can delete)
3. Delete associated access records
4. Delete associated health records
5. Delete camera
6. Return success message

---

#### 5. EnableCamera (`application/use_cases/enable_camera.py`)

**Input:** `camera_id`, `user_id`  
**Output:** `CameraResponse`

**Flow:**
1. Find camera by ID
2. Check user has MANAGE permission
3. Set `is_enabled = True`
4. Update status to ACTIVE
5. Return updated camera

---

#### 6. DisableCamera (`application/use_cases/disable_camera.py`)

**Input:** `camera_id`, `user_id`  
**Output:** `CameraResponse`

**Flow:**
1. Find camera by ID
2. Check user has MANAGE permission
3. Set `is_enabled = False`
4. Update status to INACTIVE
5. Return updated camera

---

#### 7. RecordHealth (`application/use_cases/record_health.py`)

**Input:** `camera_id`, `HealthRequest`  
**Output:** `HealthResponse`

**Flow:**
1. Find camera by ID
2. Create CameraHealth entity
3. Update camera's `last_online` if reachable
4. Update camera status based on health
5. Save health record
6. Return health response

---

#### 8. ListUserCameras (`application/use_cases/list_user_cameras.py`)

**Input:** `user_id`, `filters` (optional)  
**Output:** `CameraListResponse`

**Flow:**
1. Get all cameras user owns
2. Get all cameras user has access to
3. Combine and deduplicate
4. Apply filters (status, type, location)
5. Apply pagination
6. Return list with metadata

---

### DTOs

#### Request DTOs (`application/dtos/camera_requests.py`)

```python
class CreateCameraRequest(BaseModel):
    name: str                         # 1-100 chars
    description: Optional[str]        # max 500 chars
    stream_url: str                   # Valid URL pattern
    camera_type: CameraType
    location: CameraLocation
    resolution: Optional[str]         # e.g., "1920x1080"
    fps: Optional[int]                # 1-60
    codec: Optional[str]
    username: Optional[str]           # Stream auth
    password: Optional[str]           # Stream auth

class UpdateCameraRequest(BaseModel):
    name: Optional[str]
    description: Optional[str]
    stream_url: Optional[str]
    camera_type: Optional[CameraType]
    location: Optional[CameraLocation]
    resolution: Optional[str]
    fps: Optional[int]
    codec: Optional[str]
    username: Optional[str]
    password: Optional[str]

class RecordHealthRequest(BaseModel):
    is_reachable: bool
    latency_ms: Optional[float]
    packet_loss_percent: Optional[float]
    fps_actual: Optional[float]
    bitrate_kbps: Optional[float]
    resolution_actual: Optional[str]
    cpu_usage_percent: Optional[float]
    memory_usage_percent: Optional[float]
    temperature_celsius: Optional[float]
    error_message: Optional[str]

class CameraFilters(BaseModel):
    status: Optional[CameraStatus]
    camera_type: Optional[CameraType]
    location: Optional[CameraLocation]
    is_enabled: Optional[bool]
    search: Optional[str]             # Search name/description
    page: int = 1
    limit: int = 20
```

#### Response DTOs (`application/dtos/camera_responses.py`)

```python
class CameraResponse(BaseModel):
    id: UUID
    owner_id: UUID
    name: str
    description: Optional[str]
    stream_url: str
    camera_type: CameraType
    location: CameraLocation
    status: CameraStatus
    is_enabled: bool
    is_recording: bool
    resolution: Optional[str]
    fps: Optional[int]
    codec: Optional[str]
    thumbnail_url: Optional[str]
    last_online: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    # Excludes username/password for security

class CameraDetailResponse(CameraResponse):
    latest_health: Optional[CameraHealthResponse]
    access_count: int                  # Number of users with access

class CameraHealthResponse(BaseModel):
    id: UUID
    camera_id: UUID
    timestamp: datetime
    is_reachable: bool
    latency_ms: Optional[float]
    packet_loss_percent: Optional[float]
    fps_actual: Optional[float]
    bitrate_kbps: Optional[float]
    is_healthy: bool

class CameraListResponse(BaseModel):
    cameras: List[CameraResponse]
    total: int
    page: int
    limit: int
    has_more: bool

class MessageResponse(BaseModel):
    message: str
    success: bool = True
```

---

## API Layer

### Camera Routes (`api/routes/camera_routes.py`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/cameras` | ✓ | Create a new camera |
| `GET` | `/cameras` | ✓ | List user's cameras |
| `GET` | `/cameras/{camera_id}` | ✓ | Get camera by ID |
| `PUT` | `/cameras/{camera_id}` | ✓ | Update camera |
| `DELETE` | `/cameras/{camera_id}` | ✓ | Delete camera |
| `POST` | `/cameras/{camera_id}/enable` | ✓ | Enable camera |
| `POST` | `/cameras/{camera_id}/disable` | ✓ | Disable camera |
| `POST` | `/cameras/{camera_id}/health` | ✓ | Record health metrics |
| `GET` | `/cameras/{camera_id}/health` | ✓ | Get health history |

### Request/Response Examples

#### Create Camera

```http
POST /api/v1/cameras
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "Front Door Camera",
  "description": "Main entrance surveillance",
  "stream_url": "rtsp://192.168.1.100:554/stream1",
  "camera_type": "ip_camera",
  "location": "entrance",
  "resolution": "1920x1080",
  "fps": 30,
  "codec": "H.264",
  "username": "admin",
  "password": "camera_pass"
}
```

**Response (201 Created):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "owner_id": "user-uuid",
  "name": "Front Door Camera",
  "description": "Main entrance surveillance",
  "stream_url": "rtsp://192.168.1.100:554/stream1",
  "camera_type": "ip_camera",
  "location": "entrance",
  "status": "inactive",
  "is_enabled": true,
  "is_recording": false,
  "resolution": "1920x1080",
  "fps": 30,
  "codec": "H.264",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

#### List Cameras with Filters

```http
GET /api/v1/cameras?status=active&location=entrance&page=1&limit=10
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "cameras": [...],
  "total": 25,
  "page": 1,
  "limit": 10,
  "has_more": true
}
```

#### Record Health

```http
POST /api/v1/cameras/{camera_id}/health
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "is_reachable": true,
  "latency_ms": 45.5,
  "packet_loss_percent": 0.1,
  "fps_actual": 29.8,
  "bitrate_kbps": 4500
}
```

### Authentication Dependency

```python
async def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer())
) -> UUID:
    """
    Validates JWT token from Authorization header.
    Uses shared JWT_SECRET_KEY with auth service.
    Returns user_id from token payload.
    """
```

---

## Infrastructure Layer

### Configuration (`infrastructure/config/settings.py`)

| Setting | Default | Environment Variable |
|---------|---------|---------------------|
| `database_url` | PostgreSQL | `DATABASE_URL` |
| `jwt_secret_key` | - | `JWT_SECRET_KEY` |
| `jwt_algorithm` | HS256 | `JWT_ALGORITHM` |
| `max_cameras_per_user` | 50 | `MAX_CAMERAS_PER_USER` |
| `health_retention_days` | 30 | `HEALTH_RETENTION_DAYS` |
| `cors_origins` | ["*"] | `CORS_ORIGINS` |

### Database Models

#### CameraModel (`infrastructure/persistence/models/camera_model.py`)

```sql
Table: cameras
- id: UUID (PK)
- owner_id: UUID NOT NULL INDEXED
- name: VARCHAR(100) NOT NULL
- description: TEXT
- stream_url: VARCHAR(500) NOT NULL
- camera_type: ENUM(...) NOT NULL
- location: ENUM(...) NOT NULL
- status: ENUM(...) DEFAULT 'inactive'
- is_enabled: BOOLEAN DEFAULT TRUE
- is_recording: BOOLEAN DEFAULT FALSE
- resolution: VARCHAR(20)
- fps: INTEGER
- codec: VARCHAR(20)
- username: VARCHAR(100)            -- Encrypted
- password: VARCHAR(255)            -- Encrypted
- thumbnail_url: VARCHAR(500)
- last_online: TIMESTAMP
- created_at: TIMESTAMP NOT NULL
- updated_at: TIMESTAMP NOT NULL

UNIQUE(owner_id, name)              -- No duplicate names per user
```

#### CameraAccessModel (`infrastructure/persistence/models/camera_access_model.py`)

```sql
Table: camera_access
- id: UUID (PK)
- camera_id: UUID (FK -> cameras.id) INDEXED
- user_id: UUID NOT NULL INDEXED
- permission: ENUM('view', 'manage') NOT NULL
- granted_by: UUID NOT NULL
- granted_at: TIMESTAMP NOT NULL
- expires_at: TIMESTAMP
- is_active: BOOLEAN DEFAULT TRUE
- created_at: TIMESTAMP NOT NULL
- updated_at: TIMESTAMP NOT NULL

UNIQUE(camera_id, user_id)
```

#### CameraHealthModel (`infrastructure/persistence/models/camera_health_model.py`)

```sql
Table: camera_health
- id: UUID (PK)
- camera_id: UUID (FK -> cameras.id) INDEXED
- timestamp: TIMESTAMP NOT NULL INDEXED
- is_reachable: BOOLEAN NOT NULL
- latency_ms: FLOAT
- packet_loss_percent: FLOAT
- fps_actual: FLOAT
- bitrate_kbps: FLOAT
- resolution_actual: VARCHAR(20)
- cpu_usage_percent: FLOAT
- memory_usage_percent: FLOAT
- temperature_celsius: FLOAT
- error_message: TEXT
- created_at: TIMESTAMP NOT NULL

INDEX(camera_id, timestamp DESC)    -- For latest health queries
```

---

## Permission System

### Access Levels

| Permission | View Stream | Update Settings | Delete Camera | Grant Access |
|------------|-------------|-----------------|---------------|--------------|
| **Owner** | ✓ | ✓ | ✓ | ✓ |
| **MANAGE** | ✓ | ✓ | ✗ | ✗ |
| **VIEW** | ✓ | ✗ | ✗ | ✗ |
| **None** | ✗ | ✗ | ✗ | ✗ |

### Access Check Logic

```python
# In use cases:
def check_camera_access(camera_id: UUID, user_id: UUID, required: AccessPermission):
    # 1. Check if user is camera owner → full access
    camera = camera_repo.get_by_id(camera_id)
    if camera.owner_id == user_id:
        return True
    
    # 2. Check access record
    access = access_repo.get_by_camera_and_user(camera_id, user_id)
    if not access or not access.is_valid():
        raise CameraAccessDeniedException()
    
    # 3. Check permission level
    if required == AccessPermission.MANAGE and access.permission == AccessPermission.VIEW:
        raise CameraAccessDeniedException()
    
    return True
```

---

## Health Monitoring

### Health Status Determination

```python
def determine_camera_status(health: CameraHealth) -> CameraStatus:
    if not health.is_reachable:
        return CameraStatus.OFFLINE
    
    if health.error_message:
        return CameraStatus.ERROR
    
    if health.has_performance_issues():
        return CameraStatus.MAINTENANCE
    
    return CameraStatus.ACTIVE

def has_performance_issues(health: CameraHealth) -> bool:
    return (
        (health.latency_ms and health.latency_ms > 200) or
        (health.packet_loss_percent and health.packet_loss_percent > 5) or
        (health.fps_actual and health.fps_actual < 15)
    )
```

### Health Recording Flow

```
Monitoring Service                Camera Management
       │                                 │
       │── Test camera connectivity ────>│
       │                                 │
       │── POST /health ────────────────>│
       │   (metrics)                     │── Update camera.last_online
       │                                 │── Determine new status
       │                                 │── Save health record
       │<── HealthResponse ─────────────│
```

---

## Integration with Other Services

### With Auth Service
- Shares `JWT_SECRET_KEY` for token validation
- Validates user tokens from Auth service
- Does NOT issue tokens

### With Members Invitation Service
- Members service creates `camera_access` records
- Camera service checks access records
- Shared database or API calls for access management

### With Video Streaming Service
- Streaming service reads camera `stream_url`
- Camera service provides camera configuration
- Health metrics may come from streaming service

---

## Dependencies

```
# FastAPI
fastapi>=0.115.0
uvicorn[standard]>=0.32.0

# Database
sqlalchemy>=2.0.36
pg8000>=1.31.2
alembic>=1.14.0

# Security
python-jose[cryptography]>=3.3.0

# Validation
pydantic>=2.10.2
pydantic-settings>=2.6.1

# Encryption (for stream credentials)
cryptography>=41.0.0
```

---

## Running the Service

```bash
# Install dependencies
pip install -r requirements.txt

# Set environment variables
export DATABASE_URL="postgresql+pg8000://user:pass@localhost:5432/cameradb"
export JWT_SECRET_KEY="shared-secret-with-auth-service"

# Run migrations
alembic upgrade head

# Start server
uvicorn main:app --host 0.0.0.0 --port 8002 --reload
```

---

## API Documentation

Once running, access:
- **Swagger UI:** http://localhost:8002/docs
- **ReDoc:** http://localhost:8002/redoc
