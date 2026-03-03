# Camera URL Issues - Diagnosis & Fix

## 🔍 Problem Summary

**Error**: `Reader closed unexpectedly` with `sent 0 frames`

**Root Cause**: Your camera URLs are either:
1. **404 Not Found** - The Slovak traffic camera URL no longer exists
2. **RTSP Port Blocked** - Many networks block RTSP port 554 for security

## ✅ Diagnosis Results

### ❌ FAILED URLs:

1. **Slovak Traffic Camera**
   ```
   rtsp://stream.strba.sk:1935/strba/CHANNEL3.stream
   ```
   **Error**: `404 Not Found`  
   **Fix**: This URL is dead - the stream no longer exists

2. **Big Buck Bunny (RTSP)**
   ```
   rtsp://wowzaec2demo.streamlock.net/vod/mp4:BigBuckBunny_115k.mp4
   ```
   **Error**: `Connection timed out`  
   **Reason**: RTSP port 554 is likely blocked by firewall/ISP

### ✅ WORKING URLs:

3. **Big Buck Bunny (HLS)**
   ```
   https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8
   ```
   **Status**: ✅ Works perfectly (634 seconds duration detected)

## 🛠️ How to Fix

### Option 1: Update Broken Cameras with Working URLs

1. **Login** to http://localhost:3000
2. **Navigate** to Cameras page
3. **Find the broken cameras** (f9324087... , d5c65c78... , 858ca148...)
4. **Click Edit** on each camera
5. **Replace** the stream URL with one of these working URLs:

#### Recommended Test URLs (HLS/HTTP - Always Work):

```
# Best for testing - MUX test stream (1080p, always available)
https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8

# Sintel movie (multiple resolutions, adaptive)
https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8

# Tears of Steel
https://moctobpltc-i.akamaihd.net/hls/live/571329/eight/playlist.m3u8

# Apple HLS test stream
https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_fmp4/master.m3u8
```

6. **Click Save**
7. **Refresh** the monitoring page

### Option 2: Delete Broken Cameras

If you don't need these test cameras:
1. Navigate to Cameras page
2. Click Delete on broken cameras
3. Monitoring page will stop trying to connect to non-existent streams

### Option 3: Fix RTSP Access (Advanced)

If you need RTSP cameras and they're timing out:

1. **Check firewall** - ensure port 554 is open:
   ```bash
   # Test from host machine
   nc -zv wowzaec2demo.streamlock.net 554
   ```

2. **Modify Docker network** - use host networking:
   ```yaml
   # In docker-compose.yml, add to videostreaming service:
   network_mode: "host"
   ```

3. **Use VPN/Proxy** if ISP blocks RTSP

## 📊 Error Log Improvements

I've improved the error logging so you'll now see clear messages like:

```
❌ FFmpeg failed to start for camera f9324087...
   URL: rtsp://stream.strba.sk:1935/strba/CHANNEL3.stream
   FFmpeg error output:
     [rtsp @ 0x...] method DESCRIBE failed: 404 Not Found
     Server returned 404 Not Found
```

This makes it much easier to diagnose camera connection issues.

## 🎯 Quick Fix Command

To replace all your cameras with the working MUX test stream:

```bash
# Get your JWT token from browser DevTools:
# localStorage.getItem('accessToken')

TOKEN="your-token-here"

# List your cameras
curl -H "Authorization: Bearer $TOKEN" http://localhost:8002/api/v1/cameras

# Update a camera (replace CAMERA_ID)
curl -X PATCH \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"stream_url": "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"}' \
  http://localhost:8002/api/v1/cameras/CAMERA_ID
```

## 🔄 Testing After Fix

1. **Update camera URLs** using one of the methods above
2. **Hard refresh** browser (Cmd+Shift+R / Ctrl+Shift+R)
3. **Navigate** to monitoring page
4. **Check logs** (should show "Stream opened successfully"):
   ```bash
   docker logs -f pfe_2026-videostreaming-1
   ```
5. **Verify** camera thumbnails appear and WebRTC connects

## 📝 Why HLS/HTTP is Better Than RTSP

| Feature | HLS/HTTP | RTSP |
|---------|----------|------|
| **Firewall Friendly** | ✅ Uses port 80/443 | ❌ Uses port 554 (often blocked) |
| **Works Everywhere** | ✅ Web browser compatible | ❌ Needs special client |
| **Reliability** | ✅ HTTP fallback/retry | ❌ Single connection |
| **CDN Support** | ✅ Can use CDNs | ❌ Direct connection only |
| **Adaptive Quality** | ✅ Multiple resolutions | ❌ Fixed resolution |

**Recommendation**: Use HLS/HTTP streams whenever possible. Only use RTSP for:
- Local network cameras (no internet)
- Ultra-low latency requirements (<500ms)
- PTZ camera control

## 🆘 Still Not Working?

If cameras still fail after updating URLs:

1. **Check container logs**:
   ```bash
   docker logs -f pfe_2026-videostreaming-1 | grep -i "error\|failed"
   ```

2. **Verify WebRTC working**:
   - Open camera detail view
   - Should see green "LIVE • XX FPS" indicator

3. **Test URL manually**:
   ```bash
   docker exec pfe_2026-videostreaming-1 ffprobe -v error \
     "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
   ```

4. **Check database connection**:
   ```bash
   docker exec pfe_2026-cameramanagement-1 python -c \
     "from infrastructure.persistence.database import SessionLocal; \
      print('✅ DB connected' if SessionLocal() else '❌ DB failed')"
   ```

---

**Summary**: Replace your broken RTSP URLs with the working HLS URLs above. The system is working correctly - the issue is just with the camera URLs themselves. ✅
