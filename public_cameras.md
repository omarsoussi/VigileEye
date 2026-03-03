# Public  URLs for Testing

This file contains publicly accessible  streams you can use to test the VigileEye surveillance system.

## 🎥 Public RTSP Streams

### 1. Test s (RTSP Protocol)

```
rtsp://wowzaec2demo.streamlock.net/vod/mp4:BigBuckBunny_115k.mp4
```
- **Description**: Big Buck Bunny test video
- **Protocol**: RTSP
- **Resolution**: 240p
- **FPS**: 24
- **Status**: Always available

### 2. Sample Traffic 

```
rtsp://stream.strba.sk:1935/strba/CHANNEL3.stream
```
- **Description**: Traffic  in Štrba, Slovakia
- **Protocol**: RTSP
- **Resolution**: 720p
- **Status**: May vary

### 3. Weather 

```
rtsp://184.72.239.149/vod/mp4:BigBuckBunny_115k.mp4
```
- **Description**: Sample weather feed
- **Protocol**: RTSP  
- **Resolution**: 480p
- **Status**: Test stream

---

## 🌐 Public HTTP/HLS Streams

### 1. Big Buck Bunny (HLS)

```
https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8
```
- **Description**: Test HLS stream
- **Protocol**: HLS (HTTP Live Streaming)
- **Resolution**: 1080p
- **Status**: Always available

### 2. Sintel Test Stream

```
https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8
```
- **Description**: Sintel movie test stream
- **Protocol**: HLS
- **Resolution**: Multiple (adaptive)
- **Status**: Always available

### 3. Tears of Steel

```
https://moctobpltc-i.akamaihd.net/hls/live/571329/eight/playlist.m3u8
```
- **Description**: Tears of Steel test video
- **Protocol**: HLS
- **Resolution**: 720p
- **Status**: Usually available

---

## 📹 Public IP s (HTTP/MJPEG)

### 1. Abbey Road Crossing (London)

```
http://abbeyroad.com/cam/still.jpg
```
- **Description**: Famous Abbey Road zebra crossing
- **Protocol**: MJPEG (refreshing image)
- **Location**: London, UK
- **Resolution**: 640x480
- **Refresh Rate**: ~1 FPS

### 2. Times Square EarthCam

```
http://videos3.earthcam.com/fecnetwork/4859.flv/playlist.m3u8
```
- **Description**: Times Square, New York
- **Protocol**: HLS
- **Resolution**: 720p
- **Status**: Usually available

### 3. Niagara Falls 

```
http://niagarafalls.ca/media.nsf/niagarafalls.cam
```
- **Description**: Niagara Falls view
- **Protocol**: HTTP stream
- **Resolution**: 640x480

---

## 🔧 How to Add These s in VigileEye

### Method 1: Via Web Interface

1. **Login** to http://localhost:3000
2. **Navigate** to s → Add 
3. **Fill in details:**
   - Name: Choose a descriptive name (e.g., "Test  - Big Buck Bunny")
   - Location: Building/Zone/Floor (optional)
   - Stream URL: Paste one of the URLs above
   - Protocol: Auto-detect or select manually
   -  Type: Fixed or PTZ
4. **Click** "Add "
5. **Test** stream on monitoring page

### Method 2: Via API (cURL)

```bash
# Get your JWT token first (login)
AUTH_TOKEN="your-jwt-token-here"

# Add a 
curl -X POST http://localhost:8002/api/v1/s \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Big Buck Bunny Test",
    "description": "Public test stream for development",
    "stream_url": "rtsp://wowzaec2demo.streamlock.net/vod/mp4:BigBuckBunny_115k.mp4",
    "location": {
      "building": "Test Building",
      "zone": "Demo Zone",
      "floor": "Virtual"
    },
    "_type": "fixed",
    "is_active": true,
    "fps": 24,
    "resolution": "240p"
  }'
```

### Method 3: Via Docker Exec

```bash
# Enter the backend container
docker exec -it pfe_2026-backend-1 bash

# Use Python to add 
python -c "
from services.api import sApi
import asyncio

async def add_test_():
     = await sApi.create_({
        'name': 'Test  - Big Buck Bunny',
        'stream_url': 'rtsp://wowzaec2demo.streamlock.net/vod/mp4:BigBuckBunny_115k.mp4',
        'location': {'building': 'Test', 'zone': 'Demo'},
        'is_active': True
    })
    print(f' added: {.id}')

asyncio.run(add_test_())
"
```

---

## 🎬 Testing WebRTC Streaming

Once you've added s, test WebRTC streaming:

1. **Navigate** to `/monitoring` (Live View)
2. **Select** a 
3. **Observe** the latency indicator in the top-right
   - ✅ **Green**: <1 second (WebRTC active)
   - ⚠️ **Yellow**: 1-2 seconds
   - 🔴 **Red**: >2 seconds or disconnected

4. **Expected latency**: 400-800ms with WebRTC

---

## 🔍 Finding More Public s

### Websites with Public  Lists:

1. **insecam.org** - Thousands of unsecured s worldwide
   ⚠️ Use ethically and legally

2. **webcam.nl** - Public webcams in Netherlands

3. **camstreamer.com/live** - Various public streams

4. **skylinewebcams.com** - HD webcams worldwide

5. **EarthCam.com** - Famous location s

### GitHub Repositories:

```bash
# Clone public  lists
git clone https://github.com/aler9/rtsp-simple-server
git clone https://github.com/bengarney/list-of-streams
```

---

## ⚠️ Important Notes

1. **Respect Privacy**: Only use s intended for public viewing
2. **Check Terms**: Some streams have usage restrictions
3. **Performance**: Public streams may have:
   - Variable quality
   - Downtime periods
   - Geographic restrictions
   - Rate limiting

4. **Local Testing**: For consistent testing, consider setting up:
   - Local RTSP server (rtsp-simple-server)
   - FFmpeg re-streaming
   - IP  simulator

---

## 🛠️ Setting Up Local Test 

### Using FFmpeg (Recommended for Development)

```bash
# Install FFmpeg
brew install ffmpeg  # macOS
sudo apt-get install ffmpeg  # Ubuntu

# Create RTSP stream from video file
ffmpeg -re -i /path/to/video.mp4 \
  -c:v copy -f rtsp rtsp://localhost:8554/test

# Or from webcam
ffmpeg -f avfoundation -i "0" \  # macOS
  -c:v libx264 -preset ultrafast \
  -f rtsp rtsp://localhost:8554/webcam
```

### Using rtsp-simple-server

```bash
# Download
wget https://github.com/aler9/rtsp-simple-server/releases/download/v0.21.5/rtsp-simple-server_v0.21.5_darwin_amd64.tar.gz
tar -xzf rtsp-simple-server_v0.21.5_darwin_amd64.tar.gz

# Run
./rtsp-simple-server

# Publish stream
ffmpeg -re -i video.mp4 -c copy -f rtsp rtsp://localhost:8554/mystream

# Access via: rtsp://localhost:8554/mystream
```

---

## 📊 Expected Performance

|  Type | Protocol | Latency | Bandwidth | CPU Usage |
|-------------|----------|---------|-----------|-----------|
| Local RTSP  | RTSP → WebRTC | 400-800ms | 2-4 Mbps | Low (GPU) |
| Public RTSP | RTSP → WebRTC | 1-2s | 1-3 Mbps | Medium |
| HLS Stream  | HLS → WebRTC | 3-10s | Variable | Medium |
| MJPEG | HTTP → WebRTC | 1-3s | 512 Kbps - 2 Mbps | Low |

---

## 🎯 Recommended Test s

For initial testing, use these s in order:

1. **First**: Big Buck Bunny RTSP
   - Most reliable
   - Good for testing basic functionality

2. **Second**: Local webcam via FFmpeg
   - Zero latency
   - Full control

3. **Third**: Public HLS streams
   - Test adaptive streaming
   - Real-world conditions

4. **Fourth**: Real IP s (if available)
   - Production-like testing
   - PTZ controls (if supported)

---

## 🚀 Quick Start Commands

```bash
# 1. Add Big Buck Bunny test 
curl -X POST http://localhost:8002/api/v1/s \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test ","stream_url":"rtsp://wowzaec2demo.streamlock.net/vod/mp4:BigBuckBunny_115k.mp4","is_active":true}'

# 2. View in browser
open http://localhost:3000/monitoring

# 3. Check WebRTC connection
curl http://localhost:8003/api/v1/streams/stats
```

---

## 📧 Support

If you encounter issues with any of these streams:

1. Check if the stream is still available (URLs may change)
2. Verify your firewall allows RTSP/HTTP connections
3. Test stream with VLC first: `vlc rtsp://stream-url`
4. Check VideoStreamingBackend logs: `docker logs pfe_2026-videostreaming-1`

---

**Last Updated**: March 2026  
**Maintained by**: VigileEye Development Team
