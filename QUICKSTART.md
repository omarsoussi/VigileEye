# 🚀 Quick Start Guide - WebRTC Video Streaming

Get your WebRTC streaming system up and running in **5 minutes**!

---

## Prerequisites

- Python 3.11+
- Node.js 16+
- PostgreSQL
- FFmpeg (with H.264 support)

---

## Step 1: Install System Dependencies (2 minutes)

### macOS
```bash
brew install ffmpeg pkg-config python@3.11 postgresql
```

### Ubuntu/Debian
```bash
sudo apt-get update
sudo apt-get install -y ffmpeg pkg-config python3.11 python3.11-dev \
    build-essential postgresql postgresql-contrib
```

---

## Step 2: Setup Backend Services (All 4)

### A. Auth Backend (Port 8000)
```bash
cd Backend
python3.11 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# Setup database
cp .env.example .env
# Edit .env: Set DATABASE_URL, JWT_SECRET_KEY

# Run migrations
alembic upgrade head

# Start server
python main.py
```

**Test:** Visit http://localhost:8000/health → should return `{"status": "healthy"}`

---

### B. Camera Management Backend (Port 8002)
```bash
cd CameraManagementBackend
python3.11 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# Setup database
cp .env.example .env
# Edit .env: Set CAMERA_DATABASE_URL, JWT_SECRET_KEY (same as Auth)

# Run migrations
alembic upgrade head

# Start server
python main.py
```

**Test:** Visit http://localhost:8002/health → should return `{"status": "healthy"}`

---

### C. Members Invitation Backend (Port 8001)
```bash
cd MembersInvitationBackend
python3.11 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# Setup database
cp .env.example .env
# Edit .env: Set MEMBERS_DATABASE_URL, JWT_SECRET_KEY (same as Auth)

# Run migrations
alembic upgrade head

# Start server
python main.py
```

**Test:** Visit http://localhost:8001/health → should return `{"status": "healthy"}`

---

### D. Video Streaming Backend (Port 8003) - NEW!
```bash
cd VideoStreamingBackend
python3.11 -m venv venv
source venv/bin/activate
pip install --upgrade pip

# Install core dependencies
pip install fastapi uvicorn sqlalchemy pg8000 alembic pydantic pydantic-settings \
    python-jose[cryptography] websockets httpx asyncio-throttle aiofiles \
    opencv-python-headless numpy pytest pytest-asyncio aiortc

# Try installing PyAV (optional but recommended)
pip install av
# If PyAV fails, see INSTALL.md for troubleshooting

# Setup database
cp .env.example .env
# Edit .env with these settings:

STREAMING_DATABASE_URL=postgresql+pg8000://user:pass@localhost:5432/CMStreaming
JWT_SECRET_KEY=your-super-secret-jwt-key-min-32-chars-same-as-auth
CAMERA_API_URL=http://localhost:8002/api/v1
USE_NVENC=false  # Set to true if you have NVIDIA GPU

# Create database
createdb CMStreaming  # or use pgAdmin/DBeaver

# Run migrations
alembic upgrade head

# Start server
python main.py
```

**Test:** 
```bash
# Health check
curl http://localhost:8003/health

# WebRTC info
curl http://localhost:8003/api/v1/streams/stats
```

---

## Step 3: Setup Frontend (1 minute)

```bash
cd Front/SecurityFront
npm install

# Copy environment config
cp .env.example .env

# Edit .env and add:
REACT_APP_API_URL=http://localhost:8000/api/v1
REACT_APP_MEMBERS_API_URL=http://localhost:8001/api/v1
REACT_APP_CAMERAS_API_URL=http://localhost:8002/api/v1
REACT_APP_STREAMING_API_URL=ws://localhost:8003

# Start dev server
npm start
```

**Test:** Visit http://localhost:3000 → Should load the app

---

## Step 4: Test WebRTC Streaming

### Add a Test Camera (via Camera Management API)

```bash
# Get JWT token first (register + login via Auth API)
AUTH_TOKEN="your-jwt-token-here"

# Add a camera
curl -X POST http://localhost:8002/api/v1/cameras \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Camera",
    "location": "Office",
    "stream_url": "rtsp://example.com/stream",
    "is_active": true
  }'

# Note the returned camera ID
```

### Test WebRTC in Frontend

1. **Login** at http://localhost:3000/login
2. **Navigate** to `/camera/live/{camera-id}` (replace with your camera ID)
3. **See live stream** with latency indicator

### Or Test via WebSocket directly

```bash
# Install wscat
npm install -g wscat

# Connect to signaling endpoint
wscat -c "ws://localhost:8003/ws/signaling/{camera-id}?token=$AUTH_TOKEN"

# Send offer (example)
{
  "type": "offer",
  "sdp": "v=0\r\no=- ...",
  "sdpType": "offer"
}

# Server will respond with answer
```

---

## Troubleshooting

### Backend won't start - "ModuleNotFoundError: No module named 'av'"
```bash
# PyAV installation failed
# Option 1: Install FFmpeg dependencies first
brew install ffmpeg pkg-config  # macOS
pip install av

# Option 2: Use pre-built wheel
pip install https://github.com/PyAV-Org/PyAV/releases/download/v12.3.0/av-12.3.0-cp311-cp311-macosx_11_0_arm64.whl

# Option 3: Continue without PyAV (limited functionality)
# Comment out 'av' in requirements.txt
```

### Database connection error
```bash
# Check PostgreSQL is running
pg_isready

# Create database if missing
createdb CMStreaming

# Test connection string
psql postgresql://user:pass@localhost:5432/CMStreaming
```

### Camera stream not loading
1. **Check camera is registered** and `is_active=true`
2. **Verify RTSP URL** is accessible from backend server
3. **Check logs** in VideoStreamingBackend console
4. **Try with test stream:**
   ```bash
   # Use Big Buck Bunny test stream
   stream_url="http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
   ```

### High latency (>2 seconds)
- **Enable NVENC** (if you have NVIDIA GPU): Set `USE_NVENC=true` in .env
- **Check network**: Test with local camera first
- **Reduce resolution**: Camera settings or backend config

### WebSocket connection refused
- **CORS issue**: Check `CORS_ORIGINS` in backend .env
- **Token expired**: Get new JWT token
- **Wrong URL**: Verify `REACT_APP_STREAMING_API_URL` is correct

---

## Production Deployment

See [PRODUCTION_DEPLOYMENT.md](./PRODUCTION_DEPLOYMENT.md) for:
- Docker deployment with GPU support
- Kubernetes configuration
- SSL/TLS setup
- Load balancing
- Monitoring

---

## Next Steps

1. **Read Full Documentation**
   - [Architecture Overview](./ARCHITECTURE.md)
   - [Frontend Integration Guide](./FRONTEND_INTEGRATION.md)
   - [Production Deployment](./PRODUCTION_DEPLOYMENT.md)

2. **Add Real Cameras**
   - Configure RTSP cameras
   - Add camera credentials
   - Test streams

3. **Customize UI**
   - Modify WebRTCPlayer component
   - Add controls (PTZ, zoom, etc.)
   - Implement recording

4. **Enable GPU Acceleration** (if available)
   - Install NVIDIA drivers
   - Set `USE_NVENV=true`
   - Test performance improvement

---

## Quick Commands Reference

```bash
# Start all backends (run in separate terminals)
cd Backend && python main.py                     # Port 8000
cd CameraManagementBackend && python main.py     # Port 8002
cd MembersInvitationBackend && python main.py    # Port 8001
cd VideoStreamingBackend && python main.py       # Port 8003

# Start frontend
cd Front/SecurityFront && npm start              # Port 3000

# Run tests
cd VideoStreamingBackend && pytest               # Backend tests

# Database migrations
alembic upgrade head                              # Apply migrations
alembic revision --autogenerate -m "message"     # Create migration

# Docker deployment
docker-compose up -d                              # Start all services
docker-compose logs -f streaming-backend          # View logs
```

---

## Support

- **Issues**: Check [INSTALL.md](./INSTALL.md) for detailed troubleshooting
- **Documentation**: See `docs/` folder for service-specific guides
- **Architecture**: Review [CLAUDE.md](../CLAUDE.md) for system overview

---

**🎉 You're ready to stream! Visit http://localhost:3000 and start monitoring your cameras in real-time with sub-second latency!**
