# WebRTC Migration - Remaining Manual Updates

## ✅ COMPLETED AUTOMATICALLY

1. ✅ Backend WebSocket files removed (`VideoStreamingBackend/api/websocket/`)
2. ✅ Backend `main.py` updated (removed websocket_router import and registration)
3. ✅ `LiveThumbnail.tsx` migrated to WebRTC (uses `<video>` with `useWebRTCStream`)
4. ✅ Camera delete button z-index fixed (`99999`)
5. ✅ Zone management workflow unified (monitoring → `/zones` page)

## ⚠️ FILES REQUIRING MANUAL UPDATE

The following files still import `useVideoStream` and need to be updated to use `useWebRTCStream`:

### 1. MonitoringPageNew.tsx (2 usages)

**File**: `Front/SecurityFront/src/pages/streaming/MonitoringPageNew.tsx`

#### Usage 1: Main video preview (Line ~96)

**FIND:**
```typescript
import { useVideoStream } from '../../hooks/useVideoStream';

// ... later in component ...
const { frameUrl, connect, connectionState, error } = useVideoStream({
  camera: selectedCamera,
  autoConnect: true,
});

// ... in render ...
if (frameUrl && connectionState === 'connected') {
  return (
    <img
      src={frameUrl}
      alt={selectedCamera?.name}
      style={{ ... }}
    />
  );
}
```

**REPLACE WITH:**
```typescript
import { useWebRTCStream } from '../../hooks/useWebRTCStream';

// ... later in component ...
const authToken = localStorage.getItem('access_token') || '';
const { videoRef, state, connect } = useWebRTCStream({
  cameraId: selectedCamera?.id || '',
  authToken,
  autoConnect: true,
});

// ... in render ...
if (state.isConnected) {
  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      style={{ ... }}
    />
  );
}
```

**Also update status checks:**
- Replace `connectionState === 'connected'` with `state.isConnected`
- Replace `connectionState === 'connecting'` with `state.isConnecting`
- Replace `connectionState === 'error'` with `!!state.error`

#### Usage 2: CameraDetail component (Line ~1028)

**FIND:**
```typescript
const { frameUrl, fps: streamFps, resolution: streamResolution, connectionState } = useVideoStream({ 
  camera, 
  autoConnect: true 
});

// Download handler
const handleDownloadSnapshot = () => {
  if (!frameUrl) {
    showToast('No frame available', 'error');
    return;
  }
  const link = document.createElement('a');
  link.href = frameUrl;
  link.download = `snapshot-${camera.name}-${new Date().toISOString()}.jpg`;
  link.click();
};

// Later in render - status display
{ label: 'Status', value: connectionState === 'connected' ? 'Streaming' : connectionState === 'connecting' ? 'Connecting...' : status.charAt(0).toUpperCase() + status.slice(1) },
```

**REPLACE WITH:**
```typescript
const authToken = localStorage.getItem('access_token') || '';
const { videoRef: detailVideoRef, state } = useWebRTCStream({ 
  cameraId: camera.id, 
  authToken,
  autoConnect: true 
});

// Download handler - capture canvas snapshot
const handleDownloadSnapshot = () => {
  if (!detailVideoRef.current || !state.isConnected) {
    showToast('No video available', 'error');
    return;
  }
  
  // Capture current video frame to canvas
  const video = detailVideoRef.current;
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `snapshot-${camera.name}-${new Date().toISOString()}.jpg`;
        link.click();
        URL.revokeObjectURL(url);
      }
    }, 'image/jpeg', 0.95);
  }
};

// Update status display
{ 
  label: 'Status', 
  value: state.isConnected ? 'Streaming' : state.isConnecting ? 'Connecting...' : status.charAt(0).toUpperCase() + status.slice(1) 
},
{ 
  label: 'Latency', 
  value: state.latency ? `${state.latency}ms` : 'N/A' 
},
```

**Also update video render in CameraDetail:**
```typescript
// FIND:
<img src={frameUrl} alt={camera.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />

// REPLACE WITH:
<video 
  ref={detailVideoRef} 
  autoPlay 
  playsInline 
  muted 
  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
/>
```

### 2. ZonesPageNew.tsx (Line ~68)

**File**: `Front/SecurityFront/src/pages/core/ZonesPageNew.tsx`

**FIND:**
```typescript
import { useVideoStream } from '../../hooks/useVideoStream';

// ... in ZoneDrawingCanvas component ...
const { frameUrl } = useVideoStream({ camera, autoConnect: true });

// ... in render ...
{frameUrl && (
  <img 
    src={frameUrl} 
    alt="Camera feed"
    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }}
  />
)}
```

**REPLACE WITH:**
```typescript
import { useWebRTCStream } from '../../hooks/useWebRTCStream';

// ... in ZoneDrawingCanvas component ...
const authToken = localStorage.getItem('access_token') || '';
const { videoRef, state } = useWebRTCStream({ 
  cameraId: camera.id, 
  authToken, 
  autoConnect: true 
});

// ... in render ...
{(state.isConnected || state.isConnecting) && (
  <video 
    ref={videoRef}
    autoPlay
    playsInline
    muted
    style={{ 
      position: 'absolute', 
      inset: 0, 
      width: '100%', 
      height: '100%', 
      objectFit: 'contain',
      display: state.isConnected ? 'block' : 'none'
    }}
  />
)}
```

### 3. DashboardPageNew.tsx

**File**: `Front/SecurityFront/src/pages/core/DashboardPageNew.tsx`

**FIND:**
```typescript
import { useVideoStream } from '../../hooks/useVideoStream';

// Find all useVideoStream hooks
const { frameUrl, connectionState } = useVideoStream({ camera, autoConnect: true });

// Find all <img src={frameUrl} />
<img src={frameUrl} alt="..." style={{ ... }} />
```

**REPLACE WITH:**
```typescript
import { useWebRTCStream } from '../../hooks/useWebRTCStream';

// Replace with
const authToken = localStorage.getItem('access_token') || '';
const { videoRef, state } = useWebRTCStream({ 
  cameraId: camera.id, 
  authToken, 
  autoConnect: true 
});

// Replace with
<video ref={videoRef} autoPlay playsInline muted style={{ ... }} />
```

### 4. LiveStreamPlayer.tsx (Line ~201)

**File**: `Front/SecurityFront/src/components/LiveStreamPlayer.tsx`

**FIND:**
```typescript
import { useVideoStream, StreamConnectionState } from '../hooks/useVideoStream';

const {
  frameUrl,
  connect,
  disconnect,
  connectionState,
  error,
  fps,
  resolution,
  isStreaming,
} = useVideoStream({
  camera,
  autoConnect: true,
});

// Render with img
<img src={frameUrl} ... />
```

**REPLACE WITH:**
```typescript
import { useWebRTCStream } from '../hooks/useWebRTCStream';

const authToken = localStorage.getItem('access_token') || '';
const { videoRef, state, connect, disconnect } = useWebRTCStream({
  cameraId: camera.id,
  authToken,
  autoConnect: true,
});

// Update all references:
// - connectionState → state.isConnecting / state.isConnected
// - error → state.error
// - isStreaming → state.isConnected
// - Add state.latency for latency display

// Render with video
<video ref={videoRef} autoPlay playsInline muted ... />
```

## 🔧 Common Pattern Summary

### Import Change
```typescript
// OLD
import { useVideoStream } from '../hooks/useVideoStream';

// NEW
import { useWebRTCStream } from '../hooks/useWebRTCStream';
```

### Hook Usage Change
```typescript
// OLD
const { frameUrl, connectionState, fps, error } = useVideoStream({ 
  camera, 
  autoConnect: true 
});

// NEW
const authToken = localStorage.getItem('access_token') || '';
const { videoRef, state, connect, disconnect } = useWebRTCStream({ 
  cameraId: camera.id, 
  authToken, 
  autoConnect: true 
});
```

### State Property Mapping
```typescript
// OLD → NEW
frameUrl                    → videoRef (use with <video ref={videoRef} />)
connectionState             → state.isConnecting / state.isConnected
connectionState === 'error' → !!state.error
fps                         → state.latency (WebRTC provides latency instead)
isStreaming                 → state.isConnected
error                       → state.error
```

### Render Change
```typescript
// OLD
{frameUrl && <img src={frameUrl} alt="..." style={{ ... }} />}

// NEW
<video 
  ref={videoRef} 
  autoPlay 
  playsInline 
  muted 
  style={{ 
    ...,
    display: state.isConnected ? 'block' : 'none' 
  }} 
/>
```

## 🧪 Testing After Updates

1. **Check imports**: Search for any remaining `useVideoStream` imports
   ```bash
   grep -r "useVideoStream" Front/SecurityFront/src/
   ```

2. **Build frontend**:
   ```bash
   cd Front/SecurityFront
   npm run build
   ```

3. **Verify no WebSocket connections**:
   - Open DevTools → Network → WS tab
   - Should see only `/ws/signaling/{camera_id}` (WebRTC signaling)
   - Should NOT see any `/ws/stream` or frame streaming WebSockets

4. **Test video playback**:
   - All cameras should show live video (not static frames)
   - Latency should be < 300ms
   - Should see "LIVE" badge with pulsing animation

## 🚀 Final Rebuild

After all manual updates:

```bash
cd /Users/mac/Desktop/pfe_v2/PFE_2026

# Rebuild and restart
docker-compose build front
docker-compose down
docker-compose up -d

# Watch logs
docker-compose logs -f front
docker-compose logs -f videostreaming
```

## 📊 Expected Performance Improvements

| Metric | Before (WebSocket JPEG) | After (WebRTC) |
|--------|------------------------|----------------|
| Latency | 500-1000ms | 100-300ms |
| Bandwidth | ~100KB/s per camera | ~50-80KB/s |
| CPU Usage | High (JPEG encoding) | Lower (H264 hardware) |
| Frame Rate | 5-7 FPS | 15-30 FPS |
| Quality | Lossy JPEG (70%) | H264 adaptive |

## ✅ Verification Checklist

- [ ] No `useVideoStream` imports in any file
- [ ] All video components use `<video>` with `videoRef`
- [ ] Auth token passed to all `useWebRTCStream` hooks
- [ ] No WebSocket frame streaming in Network tab
- [ ] All cameras show smooth live video
- [ ] Zone drawing still works with video background
- [ ] Camera snapshots work (canvas capture method)
- [ ] Delete button appears above navbar
- [ ] Define Zone redirects to /zones page correctly

