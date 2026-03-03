# VigileEye System Fixes - Complete Implementation Guide

## ✅ COMPLETED: Zone Management Flow

### Changes Applied:
1. **MonitoringPageNew.tsx** - Removed inline zone drawing, button now redirects to `/zones` page with camera parameter
2. **ZonesPageNew.tsx** - Added URL parameter reading to pre-select camera and open modal automatically

### User Flow:
```
Monitoring Page → Click "Define Detection Zone" → 
Navigate to /zones?camera={id} → 
Zones page opens with modal showing selected camera → 
Fill form → Click "Draw Zone" → Draw polygon → Save
```

## 🔄 IN PROGRESS: WebSocket Removal (Use Only WebRTC)

### Files to Remove/Modify:

#### Backend - Remove WebSocket:
```bash
# Delete WebSocket module
rm -rf VideoStreamingBackend/api/websocket/

# Remove from main.py
# DELETE: app.include_router(websocket_router)

# Remove from api/__init__.py  
# DELETE: from api.websocket import websocket_router
```

#### Frontend - Replace WebSocket with WebRTC Only:
1. **hooks/useVideoStream.ts** - Currently uses WebSocket, needs complete rewrite to use WebRTC
2. **components/LiveStreamPlayer.tsx** - Uses useVideoStream hook
3. **components/LiveThumbnail.tsx** - Uses useVideoStream hook

### Recommended Approach:
Since WebRTC is already implemented (WebRTCPlayer.tsx), update all video components to use WebRTC instead of WebSocket.

**New Hook Pattern:**
```typescript
// hooks/useWebRTCStream.ts already exists!
// Use this exclusively for all video streaming
import { useWebRTCStream } from '../hooks/useWebRTC Stream';

// Replace useVideoStream calls with useWebRTCStream
const { videoRef, connectionState, ...} = useWebRTCStream({ camera });
```

## 🎯 Camera Delete Button Fix

### Issue:
Delete button hidden under navbar, z-index conflict

### Solution:
In `CameraManagementPage.tsx`, update modal z-index:

```tsx
// Find the modal container (around line 885)
style={{
  position: 'fixed', inset: 0, 
  zIndex: 99999,  // Changed from lower value
  background: 'rgba(0,0,0,0.5)',
  ...
}}
```

## ⚡ Performance Optimizations

### Already Applied:
- ✅ Frame skipping (50% reduction)
- ✅ JPEG quality reduced (85→70)
- ✅ Default FPS reduced (30→15)

### Additional Optimizations to Apply:

```python
# VideoStreamingBackend/infrastructure/streaming/stream_manager.py

# 1. More aggressive frame skipping
if sequence % 3 != 0:  # Skip 2 out of 3 frames (66% reduction)
    continue

# 2. Lower JPEG quality further
frame_quality: int = Field(default=60, alias="FRAME_QUALITY")

# 3. Reduce resolution for thumbnails
# Add before encoding:
if width > 1280:
    scale_factor = 1280 / width
    new_width = 1280
    new_height = int(height * scale_factor)
    frame_array = cv2.resize(frame_array, (new_width, new_height))
```

## 📦 Docker Rebuild Commands

```bash
cd /Users/mac/Desktop/pfe_v2/PFE_2026

# Rebuild all services
docker-compose build

# Restart services
docker-compose down
docker-compose up -d

# Or rebuild individual services:
docker-compose build videostreaming
docker-compose build cameramanagement
docker-compose build front

docker-compose up -d videostreaming cameramanagement front
```

## 🧪 Testing Checklist

### 1. Zone Management
- [ ] Go to monitoring page
- [ ]Click "Define Detection Zone" button
- [ ] Should redirect to `/zones` page
- [ ] Modal should open with camera pre-selected
- [ ] Fill form (name required)
- [ ] Click "Draw Zone" button
- [ ] Draw polygon (min 3 points)
- [ ] Click "Save" button
- [ ] Zone should be created and visible in list

### 2. Streaming (After WebSocket Removal)
- [ ] Open monitoring page
- [ ] Video should play using WebRTC only
- [ ] No WebSocket connections in browser DevTools Network tab
- [ ] Smooth playback (~7-8 FPS)
- [ ] Low latency (< 500ms)

### 3. Camera Management
- [ ] Go to cameras page
- [ ] Click delete button on any camera
- [ ] Modal should appear ABOVE navbar (not hidden)
- [ ] Delete should work properly

## 🔧 Manual Code Changes Needed

### 1. Remove WebSocket from Backend

Edit `VideoStreamingBackend/main.py`:
```python
# REMOVE this line:
# app.include_router(websocket_router, prefix="/ws")

# Keep only these:
app.include_router(stream_router, prefix="/api/v1/streams")
app.include_router(webrtc_router, prefix="/api/v1/webrtc")
app.include_router(stream_management_router, prefix="/api/v1/streams")
```

Edit  `VideoStreamingBackend/api/__init__.py`:
```python
# REMOVE:
# from api.websocket import websocket_router

# Keep:
from api.routes import stream_router, webrtc_router, stream_management_router
```

### 2. Update Frontend Video Components

Edit `Front/SecurityFront/src/components/LiveStreamPlayer.tsx`:
```tsx
// REPLACE:
// import { useVideoStream } from '../hooks/useVideoStream';
// WITH:
import { useWebRTCStream } from '../hooks/useWebRTCStream';

// REPLACE hook usage:
// const { frameUrl, ... } = useVideoStream({ camera, autoConnect: true });
// WITH:
const { videoRef, connectionState } = useWebRTCStream({ camera });

// REPLACE render:
// <img src={frameUrl} ... />
// WITH:
<video ref={videoRef} autoPlay playsInline style={{...}} />
```

Repeat for:
- `LiveThumbnail.tsx`
- `MonitoringPageNew.tsx` (CameraDetail component)

### 3. Fix Camera Delete Button Z-Index

Edit `Front/SecurityFront/src/pages/cameras/CameraManagementPage.tsx`:

Find the modal backdrop div (search for `modalMode === 'delete'`), update style:
```tsx
style={{
  position: 'fixed',
  inset: 0,
  zIndex: 99999,  // <-- CHANGE THIS
  background: 'rgba(0,0,0,0.5)',
  backdropFilter: 'blur(10px)',
  ...
}}
```

## 🚀 Quick Fix Script

```bash
#!/bin/bash
# quick_fixes.sh

cd /Users/mac/Desktop/pfe_v2/PFE_2026

echo "🔧 Applying quick fixes..."

# Remove WebSocket files
echo "Removing WebSocket backend..."
rm -rf VideoStreamingBackend/api/websocket/

# Rebuild containers
echo "Rebuilding containers..."
docker-compose build videostreaming cameramanagement front

# Restart services
echo "Restarting services..."
docker-compose down
docker-compose up -d

echo "✅ Quick fixes applied! Please test the system."
echo "⚠️  Remember to update frontend video components manually"
```

## 📊 Expected Results

### Performance:
- **CPU Usage**: 150-200% (down from 280%)
- **Frame Rate**: 5-8 FPS (smooth for security monitoring)
- **Latency**: < 300ms (WebRTC only)
- **Bandwidth**: ~50KB/s per camera (down from ~100KB/s)

### Features:
- ✅ Zone definition works from monitoring page
- ✅ Streaming uses only WebRTC (no WebSocket)
- ✅ Camera delete button visible and functional
- ✅ Smooth playback across multiple cameras

## ⚠️ Important Notes

1. **WebSocket Removal**: This is a significant architectural change. Test thoroughly after implementation.
2. **useWebRTCStream hook**: Already exists in the codebase - leverage it!
3. **Frame skipping**: If 5 FPS is too low, reduce skip ratio from 66% to 50%
4. **Image quality**: If 60% JPEG is too low quality, increase to 65-70%

## 🆘 Troubleshooting

**Issue**: Zones page doesn't open after clicking button
- **Fix**: Check browser console for navigation errors
- **Verify**: Route `/zones` exists in App.tsx

**Issue**: Video doesn't play after removing WebSocket  
- **Fix**: Ensure all components use `useWebRTCStream` instead of `useVideoStream`
- **Check**: Browser console for WebRTC connection errors

**Issue**: Camera delete button still hidden
- **Fix**: Inspect element, check z-index values, navbar might have z-index > 99999

**Issue**: Streaming still laggy
- **Fix**: Increase frame skip ratio to 75% (`if sequence % 4 != 0`)
- **Or**: Reduce resolution in stream_manager.py

