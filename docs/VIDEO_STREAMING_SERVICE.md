# Video Streaming Service - VigileEye

## Overview

The **Video Streaming Service** is the real-time video streaming component of the VigileEye security platform. It handles camera stream ingestion, frame processing, WebSocket broadcasting, and stream health monitoring. Supports RTSP, RTMP, HTTP/MJPEG, HLS, YouTube Live, and local files.

**Port:** `8003`  
**Base URL:** `/api/v1` (REST) and `/ws` (WebSocket)

---

## Architecture

The service follows **Clean Architecture** principles with specialized streaming infrastructure:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              API Layer                                   │
│  ┌────────────────────────────┐  ┌────────────────────────────────────┐ │
│  │    stream_routes.py        │  │        websocket_routes.py         │ │
│  │    /api/v1/streams/*       │  │   /ws/stream/{camera_id}           │ │
│  │                            │  │   /ws/frames/{camera_id}           │ │
│  └────────────────────────────┘  └────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼─────────────────────────────────────┐
│                         Application Layer                                │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                     StreamService (Facade)                         │  │
│  │  - start_stream()       - stop_stream()      - get_status()       │  │
│  │  - list_active()        - publish_frame()    - monitor_health()   │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────┐  ┌───────────────────────────────────────┐   │
│  │     Use Cases         │  │              DTOs                      │   │
│  │  - StartStream        │  │  - StartStreamRequest                  │   │
│  │  - StopStream         │  │  - StreamStatusResponse                │   │
│  │  - GetStreamStatus    │  │  - StreamListResponse                  │   │
│  │  - ListActiveStreams  │  │  - FrameMessage                        │   │
│  │  - PublishFrame       │  │  - HealthMetrics                       │   │
│  │  - MonitorHealth      │  └───────────────────────────────────────┘   │
│  └───────────────────────┘                                              │
└───────────────────────────────────┼─────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼─────────────────────────────────────┐
│                           Domain Layer                                   │
│  ┌────────────────────┐  ┌─────────────────────┐  ┌──────────────────┐  │
│  │     Entities       │  │      Enums          │  │   Repositories   │  │
│  │  - StreamSession   │  │  - StreamStatus     │  │  - SessionRepo   │  │
│  │  - StreamConfig    │  │  - FrameFormat      │  │                  │  │
│  │  - VideoFrame      │  │  - StreamType       │  │                  │  │
│  └────────────────────┘  └─────────────────────┘  └──────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                     Domain Exceptions                             │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└───────────────────────────────────┼─────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼─────────────────────────────────────┐
│                       Infrastructure Layer                               │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                     Streaming Infrastructure                      │   │
│  │                                                                   │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐   │   │
│  │  │  StreamManager  │  │StreamBroadcaster│  │ StreamResolver  │   │   │
│  │  │   (Main Hub)    │  │  (WebSocket)    │  │ (URL Detection) │   │   │
│  │  └────────┬────────┘  └─────────────────┘  └─────────────────┘   │   │
│  │           │                                                       │   │
│  │  ┌────────▼────────┐  ┌─────────────────┐  ┌─────────────────┐   │   │
│  │  │CameraStreamReader│ │FFmpegStreamReader│ │  FrameEncoder   │   │   │
│  │  │    (OpenCV)      │ │   (FFmpeg)       │ │  (JPEG/PNG)     │   │   │
│  │  └──────────────────┘ └─────────────────┘  └─────────────────┘   │   │
│  │                                                                   │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌──────────────┐  ┌────────────────┐  ┌──────────────────────────┐     │
│  │   Config     │  │   Persistence  │  │        Security          │     │
│  │ - settings   │  │  - database    │  │  - JWT validation        │     │
│  └──────────────┘  │  - models      │  └──────────────────────────┘     │
│                    │  - repos       │                                    │
│                    └────────────────┘                                    │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## File Structure

```
VideoStreamingBackend/
├── main.py                          # FastAPI entry point
├── alembic.ini                      # Database migrations config
├── requirements.txt                 # Python dependencies
│
├── api/                             # API Layer
│   ├── __init__.py
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── stream_routes.py         # REST endpoints
│   │   └── websocket_routes.py      # WebSocket endpoints
│   └── dependencies/
│       ├── __init__.py
│       └── auth_deps.py             # JWT authentication
│
├── application/                     # Application Layer
│   ├── __init__.py
│   ├── services/
│   │   ├── __init__.py
│   │   └── stream_service.py        # Facade for use cases
│   ├── use_cases/
│   │   ├── __init__.py
│   │   ├── start_stream.py          # Start streaming
│   │   ├── stop_stream.py           # Stop streaming
│   │   ├── get_stream_status.py     # Get stream info
│   │   ├── list_active_streams.py   # List active streams
│   │   ├── publish_frame.py         # Broadcast frame
│   │   └── monitor_health.py        # Health monitoring
│   └── dtos/
│       ├── __init__.py
│       ├── stream_requests.py       # Request DTOs
│       └── stream_responses.py      # Response DTOs
│
├── domain/                          # Domain Layer
│   ├── __init__.py
│   ├── exceptions.py                # Domain exceptions
│   ├── entities/
│   │   ├── __init__.py
│   │   ├── stream_session.py        # Stream session entity
│   │   ├── stream_config.py         # Configuration entity
│   │   └── video_frame.py           # Frame entity
│   └── repositories/
│       ├── __init__.py
│       └── stream_session_repository.py
│
├── infrastructure/                  # Infrastructure Layer
│   ├── __init__.py
│   ├── config/
│   │   ├── __init__.py
│   │   └── settings.py
│   ├── security/
│   │   ├── __init__.py
│   │   └── jwt_handler.py           # JWT validation
│   ├── streaming/                   # Core Streaming Components
│   │   ├── __init__.py
│   │   ├── stream_manager.py        # Main stream orchestrator
│   │   ├── stream_broadcaster.py    # WebSocket management
│   │   ├── stream_resolver.py       # URL type detection
│   │   ├── camera_stream_reader.py  # OpenCV-based reader
│   │   ├── ffmpeg_stream_reader.py  # FFmpeg-based reader
│   │   └── frame_encoder.py         # Frame encoding
│   └── persistence/
│       ├── __init__.py
│       ├── database.py
│       ├── models/
│       │   ├── __init__.py
│       │   └── stream_session_model.py
│       ├── mappers/
│       │   ├── __init__.py
│       │   └── stream_session_mapper.py
│       └── repositories/
│           ├── __init__.py
│           └── stream_session_repository_impl.py
│
└── alembic/                         # Database migrations
    ├── env.py
    └── versions/
```

---

## Domain Layer

### Entities

#### StreamSession Entity (`domain/entities/stream_session.py`)

Represents an active or historical streaming session.

```python
class StreamStatus(str, Enum):
    PENDING = "pending"           # Waiting to start
    CONNECTING = "connecting"     # Establishing connection
    ACTIVE = "active"             # Streaming live
    RECONNECTING = "reconnecting" # Attempting to reconnect
    STOPPED = "stopped"           # Gracefully stopped
    ERROR = "error"               # Failed/errored

@dataclass
class StreamSession:
    id: UUID
    camera_id: UUID
    user_id: UUID                  # Who started the stream
    status: StreamStatus
    stream_url: str
    stream_type: str               # rtsp, rtmp, hls, mjpeg, youtube, file
    started_at: Optional[datetime]
    stopped_at: Optional[datetime]
    last_frame_at: Optional[datetime]
    frame_count: int
    error_count: int
    last_error: Optional[str]
    reconnect_attempts: int
    config: "StreamConfig"
    created_at: datetime
    updated_at: datetime

    def start(self) -> None
    def stop(self, reason: Optional[str] = None) -> None
    def mark_error(self, error: str) -> None
    def mark_reconnecting(self) -> None
    def mark_active(self) -> None
    def update_frame_timestamp(self) -> None
    def increment_frame_count(self) -> None
    def is_active(self) -> bool
    def is_running(self) -> bool      # active or reconnecting
    def get_uptime_seconds(self) -> float
    def get_fps_actual(self) -> float
```

#### StreamConfig Entity (`domain/entities/stream_config.py`)

Configuration for stream processing.

```python
@dataclass
class StreamConfig:
    resolution: Optional[str]      # Target resolution (e.g., "1280x720")
    fps: int                       # Target FPS (default: 30)
    quality: int                   # JPEG quality 1-100 (default: 85)
    format: FrameFormat            # JPEG or PNG
    buffer_size: int               # Frame buffer size
    timeout_seconds: int           # Connection timeout
    reconnect_delay: int           # Seconds between reconnects
    max_reconnect_attempts: int    # Max reconnection tries

    @classmethod
    def default(cls) -> "StreamConfig":
        return cls(
            resolution=None,
            fps=30,
            quality=85,
            format=FrameFormat.JPEG,
            buffer_size=10,
            timeout_seconds=30,
            reconnect_delay=5,
            max_reconnect_attempts=3
        )
```

#### VideoFrame Entity (`domain/entities/video_frame.py`)

Represents a single video frame.

```python
class FrameFormat(str, Enum):
    JPEG = "jpeg"
    PNG = "png"
    RAW = "raw"          # Uncompressed BGR

@dataclass
class VideoFrame:
    camera_id: UUID
    session_id: UUID
    sequence_number: int
    timestamp: datetime
    format: FrameFormat
    width: int
    height: int
    data: bytes               # Encoded frame data
    size_bytes: int

    def to_base64(self) -> str:
        return base64.b64encode(self.data).decode()

    def to_data_uri(self) -> str:
        mime = "image/jpeg" if self.format == FrameFormat.JPEG else "image/png"
        return f"data:{mime};base64,{self.to_base64()}"

    @property
    def resolution(self) -> str:
        return f"{self.width}x{self.height}"
```

### Domain Exceptions (`domain/exceptions.py`)

| Exception | HTTP Status | Description |
|-----------|-------------|-------------|
| `StreamNotFoundException` | 404 | Stream session not found |
| `StreamAlreadyActiveException` | 409 | Camera already streaming |
| `StreamConnectionException` | 503 | Cannot connect to camera |
| `InvalidStreamUrlException` | 400 | Invalid or unsupported URL |
| `StreamNotActiveException` | 400 | Stream is not active |
| `CameraAccessDeniedException` | 403 | No access to camera |
| `StreamTimeoutException` | 408 | Connection/read timeout |
| `UnsupportedStreamTypeException` | 400 | Stream type not supported |
| `MaxStreamsExceededException` | 429 | Too many active streams |

---

## Application Layer

### Use Cases

#### 1. StartStream (`application/use_cases/start_stream.py`)

**Input:** `camera_id`, `user_id`, `StreamConfig` (optional)  
**Output:** `StreamStatusResponse`

**Flow:**
1. Check user has access to camera
2. Check no active stream exists for camera
3. Get camera stream URL from Camera Management
4. Detect stream type (RTSP/RTMP/HLS/etc.)
5. Create StreamSession entity
6. Start async streaming task
7. Mark session as CONNECTING
8. Return session info

---

#### 2. StopStream (`application/use_cases/stop_stream.py`)

**Input:** `camera_id`, `user_id`  
**Output:** `MessageResponse`

**Flow:**
1. Find active session for camera
2. Check user has permission to stop
3. Cancel async streaming task
4. Mark session as STOPPED
5. Disconnect all WebSocket clients
6. Return success message

---

#### 3. GetStreamStatus (`application/use_cases/get_stream_status.py`)

**Input:** `camera_id`, `user_id`  
**Output:** `StreamStatusResponse`

**Flow:**
1. Find session for camera (active or recent)
2. Return status, metrics, and config

---

#### 4. ListActiveStreams (`application/use_cases/list_active_streams.py`)

**Input:** `user_id`, pagination  
**Output:** `StreamListResponse`

**Flow:**
1. Get all active sessions for user's accessible cameras
2. Apply pagination
3. Return list with connection counts

---

#### 5. PublishFrame (`application/use_cases/publish_frame.py`)

**Input:** `camera_id`, `VideoFrame`  
**Output:** None (async broadcast)

**Flow:**
1. Encode frame to configured format
2. Get all subscribed WebSocket connections
3. Broadcast frame to all subscribers
4. Update session metrics

---

#### 6. MonitorHealth (`application/use_cases/monitor_health.py`)

**Input:** `camera_id`  
**Output:** `HealthMetrics`

**Flow:**
1. Get active session
2. Calculate actual FPS
3. Check frame freshness
4. Return health metrics

---

### DTOs

#### Request DTOs (`application/dtos/stream_requests.py`)

```python
class StartStreamRequest(BaseModel):
    camera_id: UUID
    resolution: Optional[str]      # e.g., "1280x720"
    fps: int = 30                  # 1-60
    quality: int = 85              # 1-100 for JPEG
    format: FrameFormat = FrameFormat.JPEG

class StopStreamRequest(BaseModel):
    camera_id: UUID
    force: bool = False            # Force stop even if others watching
```

#### Response DTOs (`application/dtos/stream_responses.py`)

```python
class StreamStatusResponse(BaseModel):
    session_id: UUID
    camera_id: UUID
    status: StreamStatus
    stream_type: str
    started_at: Optional[datetime]
    uptime_seconds: float
    frame_count: int
    fps_actual: float
    subscriber_count: int
    last_frame_at: Optional[datetime]
    last_error: Optional[str]
    config: StreamConfigDTO

class StreamConfigDTO(BaseModel):
    resolution: Optional[str]
    fps: int
    quality: int
    format: FrameFormat

class StreamListResponse(BaseModel):
    streams: List[StreamStatusResponse]
    total: int
    page: int
    limit: int

class HealthMetrics(BaseModel):
    is_healthy: bool
    fps_actual: float
    fps_target: int
    frame_delay_ms: float
    buffer_usage_percent: float
    error_rate: float
    subscriber_count: int

class FrameMessage(BaseModel):
    camera_id: UUID
    timestamp: datetime
    sequence: int
    format: str
    width: int
    height: int
    data: str                      # Base64 encoded

class MessageResponse(BaseModel):
    message: str
    success: bool = True
```

---

## API Layer

### REST Routes (`api/routes/stream_routes.py`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/streams/start` | ✓ | Start streaming a camera |
| `POST` | `/streams/stop` | ✓ | Stop streaming a camera |
| `GET` | `/streams/{camera_id}/status` | ✓ | Get stream status |
| `GET` | `/streams` | ✓ | List user's active streams |

### WebSocket Routes (`api/routes/websocket_routes.py`)

| Endpoint | Auth | Description |
|----------|------|-------------|
| `/ws/stream/{camera_id}` | Token query param | Subscribe to frame stream |
| `/ws/frames/{camera_id}` | Token query param | Alternative frame endpoint |

### REST Request/Response Examples

#### Start Stream

```http
POST /api/v1/streams/start
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "camera_id": "550e8400-e29b-41d4-a716-446655440000",
  "resolution": "1280x720",
  "fps": 30,
  "quality": 85,
  "format": "jpeg"
}
```

**Response (200 OK):**
```json
{
  "session_id": "session-uuid",
  "camera_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "connecting",
  "stream_type": "rtsp",
  "started_at": null,
  "uptime_seconds": 0,
  "frame_count": 0,
  "fps_actual": 0.0,
  "subscriber_count": 0,
  "config": {
    "resolution": "1280x720",
    "fps": 30,
    "quality": 85,
    "format": "jpeg"
  }
}
```

#### Get Stream Status

```http
GET /api/v1/streams/{camera_id}/status
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "session_id": "session-uuid",
  "camera_id": "camera-uuid",
  "status": "active",
  "stream_type": "rtsp",
  "started_at": "2024-01-15T10:30:00Z",
  "uptime_seconds": 3600.5,
  "frame_count": 108015,
  "fps_actual": 29.8,
  "subscriber_count": 3,
  "last_frame_at": "2024-01-15T11:30:00Z",
  "last_error": null
}
```

### WebSocket Connection

```javascript
// Connect to stream
const ws = new WebSocket(
  `wss://api.example.com/ws/stream/${cameraId}?token=${accessToken}`
);

// Receive frames
ws.onmessage = (event) => {
  const frame = JSON.parse(event.data);
  // frame = {
  //   camera_id: "uuid",
  //   timestamp: "2024-01-15T10:30:00Z",
  //   sequence: 12345,
  //   format: "jpeg",
  //   width: 1280,
  //   height: 720,
  //   data: "base64-encoded-jpeg..."
  // }
  
  // Display frame
  const img = document.getElementById('stream');
  img.src = `data:image/jpeg;base64,${frame.data}`;
};

// Handle events
ws.onopen = () => console.log('Connected');
ws.onerror = (e) => console.error('Error:', e);
ws.onclose = () => console.log('Disconnected');
```

---

## Infrastructure Layer - Streaming Components

### StreamManager (`infrastructure/streaming/stream_manager.py`)

The main orchestrator that coordinates all streaming operations.

```python
class StreamManager:
    def __init__(
        self,
        broadcaster: StreamBroadcaster,
        resolver: StreamResolver,
        session_repo: StreamSessionRepository
    ):
        self._active_tasks: Dict[UUID, asyncio.Task] = {}
        self._readers: Dict[UUID, BaseStreamReader] = {}

    async def start_stream(
        self,
        camera_id: UUID,
        stream_url: str,
        config: StreamConfig
    ) -> StreamSession:
        """
        1. Resolve stream URL to detect type
        2. Select appropriate reader (OpenCV or FFmpeg)
        3. Create streaming task
        4. Start async frame reading loop
        """

    async def stop_stream(self, camera_id: UUID) -> None:
        """
        1. Cancel streaming task
        2. Close reader connection
        3. Disconnect all subscribers
        """

    async def _streaming_loop(
        self,
        session: StreamSession,
        reader: BaseStreamReader
    ) -> None:
        """
        Main loop:
        while running:
            frame = await reader.read_frame()
            if frame:
                encoded = encoder.encode(frame, config)
                await broadcaster.broadcast(camera_id, encoded)
                session.increment_frame_count()
            else:
                handle_error_or_reconnect()
        """

    def _select_reader(self, stream_type: str, url: str) -> BaseStreamReader:
        """
        Select reader based on stream type:
        - RTSP, RTMP, USB, FILE → CameraStreamReader (OpenCV)
        - HLS, YouTube → FFmpegStreamReader
        - MJPEG → Either (OpenCV preferred)
        """
```

### StreamBroadcaster (`infrastructure/streaming/stream_broadcaster.py`)

Manages WebSocket connections for frame distribution.

```python
class StreamBroadcaster:
    def __init__(self):
        self._subscribers: Dict[UUID, Set[WebSocket]] = defaultdict(set)
        self._locks: Dict[UUID, asyncio.Lock] = defaultdict(asyncio.Lock)

    async def subscribe(self, camera_id: UUID, websocket: WebSocket) -> None:
        """Add client to camera's subscriber list"""
        async with self._locks[camera_id]:
            self._subscribers[camera_id].add(websocket)

    async def unsubscribe(self, camera_id: UUID, websocket: WebSocket) -> None:
        """Remove client from camera's subscriber list"""
        async with self._locks[camera_id]:
            self._subscribers[camera_id].discard(websocket)

    async def broadcast(self, camera_id: UUID, frame: VideoFrame) -> None:
        """
        Send frame to all subscribers of a camera.
        Handles disconnected clients gracefully.
        """
        message = frame.to_json()
        disconnected = []
        
        for ws in self._subscribers[camera_id]:
            try:
                await ws.send_text(message)
            except WebSocketDisconnect:
                disconnected.append(ws)
        
        # Clean up disconnected clients
        for ws in disconnected:
            await self.unsubscribe(camera_id, ws)

    def get_subscriber_count(self, camera_id: UUID) -> int:
        """Get number of active subscribers"""
        return len(self._subscribers.get(camera_id, set()))

    async def disconnect_all(self, camera_id: UUID) -> None:
        """Disconnect all subscribers for a camera"""
        for ws in list(self._subscribers.get(camera_id, [])):
            try:
                await ws.close()
            except:
                pass
        self._subscribers[camera_id].clear()
```

### StreamResolver (`infrastructure/streaming/stream_resolver.py`)

Detects stream type from URL and resolves complex URLs.

```python
class StreamType(str, Enum):
    RTSP = "rtsp"
    RTMP = "rtmp"
    HTTP = "http"      # HTTP-based streams
    MJPEG = "mjpeg"
    HLS = "hls"
    YOUTUBE = "youtube"
    FILE = "file"
    UNKNOWN = "unknown"

class StreamResolver:
    # URL patterns for detection
    PATTERNS = {
        StreamType.RTSP: r'^rtsp://',
        StreamType.RTMP: r'^rtmp://',
        StreamType.HLS: r'\.m3u8(\?|$)',
        StreamType.MJPEG: r'(mjpg|mjpeg|video\.cgi)',
        StreamType.YOUTUBE: r'(youtube\.com|youtu\.be)',
        StreamType.FILE: r'^(file://|/|[A-Z]:)',
    }

    def detect_type(self, url: str) -> StreamType:
        """Detect stream type from URL pattern"""
        for stream_type, pattern in self.PATTERNS.items():
            if re.search(pattern, url, re.IGNORECASE):
                return stream_type
        
        if url.startswith('http'):
            return StreamType.HTTP
        
        return StreamType.UNKNOWN

    async def resolve_youtube(self, url: str) -> str:
        """
        Use yt-dlp to extract direct stream URL from YouTube.
        Returns best quality live stream URL.
        """
        import yt_dlp
        
        ydl_opts = {
            'format': 'best[ext=mp4]/best',
            'quiet': True,
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            return info['url']

    async def resolve(self, url: str) -> tuple[str, StreamType]:
        """
        Resolve URL and return direct stream URL with type.
        Handles YouTube URL conversion.
        """
        stream_type = self.detect_type(url)
        
        if stream_type == StreamType.YOUTUBE:
            resolved_url = await self.resolve_youtube(url)
            return resolved_url, stream_type
        
        return url, stream_type
```

### CameraStreamReader (`infrastructure/streaming/camera_stream_reader.py`)

OpenCV-based stream reader for RTSP, RTMP, USB, and files.

```python
class CameraStreamReader:
    """
    OpenCV (cv2.VideoCapture) based reader.
    Best for: RTSP, RTMP, USB cameras, local files, MJPEG.
    """

    # OpenCV backend priority
    BACKENDS = [
        cv2.CAP_FFMPEG,      # FFmpeg backend (most compatible)
        cv2.CAP_GSTREAMER,   # GStreamer (Linux)
        cv2.CAP_DSHOW,       # DirectShow (Windows)
        cv2.CAP_V4L2,        # Video4Linux (Linux)
        cv2.CAP_ANY,         # Auto-detect
    ]

    def __init__(self, url: str, config: StreamConfig):
        self.url = url
        self.config = config
        self.capture: Optional[cv2.VideoCapture] = None
        self._is_connected = False

    async def connect(self) -> bool:
        """
        Connect to stream with backend fallback.
        Tries each backend until one succeeds.
        """
        for backend in self.BACKENDS:
            self.capture = cv2.VideoCapture(self.url, backend)
            
            # Configure capture
            if self.config.resolution:
                w, h = map(int, self.config.resolution.split('x'))
                self.capture.set(cv2.CAP_PROP_FRAME_WIDTH, w)
                self.capture.set(cv2.CAP_PROP_FRAME_HEIGHT, h)
            
            self.capture.set(cv2.CAP_PROP_FPS, self.config.fps)
            self.capture.set(cv2.CAP_PROP_BUFFERSIZE, self.config.buffer_size)
            
            if self.capture.isOpened():
                self._is_connected = True
                return True
        
        return False

    async def read_frame(self) -> Optional[np.ndarray]:
        """
        Read single frame from stream.
        Returns BGR numpy array or None on failure.
        """
        if not self._is_connected:
            return None
        
        ret, frame = self.capture.read()
        if ret:
            return frame  # BGR numpy array
        return None

    async def disconnect(self) -> None:
        """Release capture resources"""
        if self.capture:
            self.capture.release()
        self._is_connected = False

    def is_connected(self) -> bool:
        return self._is_connected and self.capture and self.capture.isOpened()

    def get_properties(self) -> dict:
        """Get actual stream properties"""
        if not self.capture:
            return {}
        return {
            'width': int(self.capture.get(cv2.CAP_PROP_FRAME_WIDTH)),
            'height': int(self.capture.get(cv2.CAP_PROP_FRAME_HEIGHT)),
            'fps': self.capture.get(cv2.CAP_PROP_FPS),
            'backend': self.capture.getBackendName(),
        }
```

### FFmpegStreamReader (`infrastructure/streaming/ffmpeg_stream_reader.py`)

FFmpeg-based reader for HLS, YouTube, and complex streams.

```python
class FFmpegStreamReader:
    """
    FFmpeg subprocess-based reader.
    Best for: HLS (.m3u8), YouTube (via yt-dlp), complex protocols.
    """

    def __init__(self, url: str, config: StreamConfig):
        self.url = url
        self.config = config
        self.process: Optional[subprocess.Popen] = None
        self._is_connected = False
        self._frame_size: Optional[tuple] = None

    async def connect(self) -> bool:
        """
        Start FFmpeg subprocess to read stream.
        Outputs raw BGR frames to stdout.
        """
        # Determine output resolution
        if self.config.resolution:
            width, height = map(int, self.config.resolution.split('x'))
        else:
            width, height = 1280, 720  # Default
        
        self._frame_size = (width, height)
        
        cmd = [
            'ffmpeg',
            '-i', self.url,
            '-f', 'rawvideo',
            '-pix_fmt', 'bgr24',
            '-s', f'{width}x{height}',
            '-r', str(self.config.fps),
            '-loglevel', 'error',
            '-'  # Output to stdout
        ]
        
        try:
            self.process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                bufsize=10**8
            )
            self._is_connected = True
            return True
        except Exception as e:
            return False

    async def read_frame(self) -> Optional[np.ndarray]:
        """
        Read single frame from FFmpeg stdout.
        Returns BGR numpy array or None on failure.
        """
        if not self._is_connected or not self.process:
            return None
        
        width, height = self._frame_size
        frame_size = width * height * 3  # BGR = 3 bytes per pixel
        
        raw_frame = self.process.stdout.read(frame_size)
        if len(raw_frame) != frame_size:
            return None
        
        # Convert to numpy array
        frame = np.frombuffer(raw_frame, dtype=np.uint8)
        frame = frame.reshape((height, width, 3))
        return frame

    async def disconnect(self) -> None:
        """Terminate FFmpeg process"""
        if self.process:
            self.process.terminate()
            self.process.wait()
        self._is_connected = False

    def is_connected(self) -> bool:
        return self._is_connected and self.process and self.process.poll() is None
```

### FrameEncoder (`infrastructure/streaming/frame_encoder.py`)

Encodes raw frames to JPEG/PNG.

```python
class FrameEncoder:
    def encode(
        self,
        frame: np.ndarray,
        format: FrameFormat,
        quality: int = 85
    ) -> bytes:
        """
        Encode BGR numpy array to JPEG or PNG bytes.
        """
        if format == FrameFormat.JPEG:
            encode_params = [cv2.IMWRITE_JPEG_QUALITY, quality]
            _, buffer = cv2.imencode('.jpg', frame, encode_params)
        elif format == FrameFormat.PNG:
            compress_level = int((100 - quality) / 10)  # 0-9
            encode_params = [cv2.IMWRITE_PNG_COMPRESSION, compress_level]
            _, buffer = cv2.imencode('.png', frame, encode_params)
        else:
            return frame.tobytes()  # RAW format
        
        return buffer.tobytes()

    def create_video_frame(
        self,
        frame: np.ndarray,
        camera_id: UUID,
        session_id: UUID,
        sequence: int,
        format: FrameFormat,
        quality: int
    ) -> VideoFrame:
        """Create VideoFrame entity from raw frame"""
        height, width = frame.shape[:2]
        data = self.encode(frame, format, quality)
        
        return VideoFrame(
            camera_id=camera_id,
            session_id=session_id,
            sequence_number=sequence,
            timestamp=datetime.utcnow(),
            format=format,
            width=width,
            height=height,
            data=data,
            size_bytes=len(data)
        )
```

---

## Stream Data Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Camera/Source                                  │
│                    (RTSP/RTMP/HLS/YouTube/File)                         │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
                                ▼
┌───────────────────────────────────────────────────────────────────────┐
│                         StreamResolver                                 │
│                  (Detect Type, Resolve YouTube)                        │
└───────────────────────────────┬───────────────────────────────────────┘
                                │
              ┌─────────────────┴─────────────────┐
              │                                   │
              ▼                                   ▼
┌──────────────────────────┐        ┌──────────────────────────┐
│   CameraStreamReader     │        │   FFmpegStreamReader     │
│       (OpenCV)           │        │      (FFmpeg)            │
│  RTSP, RTMP, USB, MJPEG  │        │   HLS, YouTube           │
└────────────┬─────────────┘        └────────────┬─────────────┘
             │                                   │
             └─────────────────┬─────────────────┘
                               │
                               ▼
                   ┌─────────────────────┐
                   │    Raw BGR Frame    │
                   │   (numpy ndarray)   │
                   └──────────┬──────────┘
                              │
                              ▼
                   ┌─────────────────────┐
                   │    FrameEncoder     │
                   │   (JPEG/PNG/RAW)    │
                   └──────────┬──────────┘
                              │
                              ▼
                   ┌─────────────────────┐
                   │     VideoFrame      │
                   │     (Entity)        │
                   └──────────┬──────────┘
                              │
                              ▼
                   ┌─────────────────────┐
                   │  StreamBroadcaster  │
                   └──────────┬──────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  WebSocket   │    │  WebSocket   │    │  WebSocket   │
│   Client 1   │    │   Client 2   │    │   Client N   │
└──────────────┘    └──────────────┘    └──────────────┘
```

---

## Database Models

### StreamSessionModel (`infrastructure/persistence/models/stream_session_model.py`)

```sql
Table: stream_sessions
- id: UUID (PK)
- camera_id: UUID NOT NULL INDEXED
- user_id: UUID NOT NULL
- status: ENUM('pending', 'connecting', 'active', 'reconnecting', 'stopped', 'error')
- stream_url: VARCHAR(500) NOT NULL
- stream_type: VARCHAR(20) NOT NULL
- started_at: TIMESTAMP
- stopped_at: TIMESTAMP
- last_frame_at: TIMESTAMP
- frame_count: BIGINT DEFAULT 0
- error_count: INTEGER DEFAULT 0
- last_error: TEXT
- reconnect_attempts: INTEGER DEFAULT 0
- config_json: JSONB                  -- StreamConfig as JSON
- created_at: TIMESTAMP NOT NULL
- updated_at: TIMESTAMP NOT NULL

INDEX(camera_id, status)              -- For active session lookup
INDEX(user_id, status)                -- For user's streams
```

---

## Configuration (`infrastructure/config/settings.py`)

| Setting | Default | Environment Variable |
|---------|---------|---------------------|
| `database_url` | PostgreSQL | `DATABASE_URL` |
| `jwt_secret_key` | - | `JWT_SECRET_KEY` |
| `jwt_algorithm` | HS256 | `JWT_ALGORITHM` |
| `max_streams_per_user` | 10 | `MAX_STREAMS_PER_USER` |
| `default_fps` | 30 | `DEFAULT_FPS` |
| `default_quality` | 85 | `DEFAULT_QUALITY` |
| `connection_timeout` | 30 | `CONNECTION_TIMEOUT` |
| `reconnect_delay` | 5 | `RECONNECT_DELAY` |
| `max_reconnect_attempts` | 3 | `MAX_RECONNECT_ATTEMPTS` |
| `frame_buffer_size` | 10 | `FRAME_BUFFER_SIZE` |
| `cors_origins` | ["*"] | `CORS_ORIGINS` |

---

## Integration with Other Services

### With Auth Service
- Validates JWT tokens using shared secret
- Extracts user_id from token for authorization

### With Camera Management Service
- Fetches camera stream URL by camera_id
- Validates user has VIEW permission
- May query camera configuration (resolution, FPS)

```python
# Example integration
async def get_camera_stream_url(camera_id: UUID, user_token: str) -> str:
    response = await http_client.get(
        f"{CAMERA_SERVICE_URL}/cameras/{camera_id}",
        headers={"Authorization": f"Bearer {user_token}"}
    )
    if response.status_code == 200:
        return response.json()["stream_url"]
    elif response.status_code == 403:
        raise CameraAccessDeniedException()
    elif response.status_code == 404:
        raise CameraNotFoundException()
```

---

## Supported Stream Types

| Type | URL Pattern | Reader | Notes |
|------|-------------|--------|-------|
| **RTSP** | `rtsp://...` | OpenCV | IP cameras, NVRs |
| **RTMP** | `rtmp://...` | OpenCV | Streaming servers |
| **HLS** | `*.m3u8` | FFmpeg | HTTP Live Streaming |
| **MJPEG** | Various | OpenCV | Motion JPEG |
| **YouTube** | `youtube.com/*` | FFmpeg | Requires yt-dlp |
| **HTTP** | `http://...` | OpenCV | Generic HTTP streams |
| **File** | `/path/...` | OpenCV | Local video files |
| **USB** | `0`, `1`, etc. | OpenCV | USB webcams |

---

## Dependencies

```
# FastAPI
fastapi>=0.115.0
uvicorn[standard]>=0.32.0

# WebSockets
websockets>=12.0

# Database  
sqlalchemy>=2.0.36
pg8000>=1.31.2
alembic>=1.14.0

# Security
python-jose[cryptography]>=3.3.0

# Video Processing
opencv-python>=4.8.0
numpy>=1.24.0

# YouTube Support
yt-dlp>=2024.1.0

# Validation
pydantic>=2.10.2
pydantic-settings>=2.6.1

# HTTP Client
httpx>=0.28.0
```

**System Dependencies:**
```bash
# Ubuntu/Debian
apt-get install ffmpeg libgstreamer1.0-dev

# macOS
brew install ffmpeg

# Windows
# Download FFmpeg from https://ffmpeg.org/download.html
```

---

## Running the Service

```bash
# Install dependencies
pip install -r requirements.txt

# Set environment variables
export DATABASE_URL="postgresql+pg8000://user:pass@localhost:5432/streamdb"
export JWT_SECRET_KEY="shared-secret-with-auth-service"

# Run migrations
alembic upgrade head

# Start server
uvicorn main:app --host 0.0.0.0 --port 8003 --reload
```

---

## API Documentation

Once running, access:
- **Swagger UI:** http://localhost:8003/docs
- **ReDoc:** http://localhost:8003/redoc
- **WebSocket:** `ws://localhost:8003/ws/stream/{camera_id}?token=...`
