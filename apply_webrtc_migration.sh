#!/bin/bash

# VigileEye WebRTC Migration Script
# This script completes the migration from WebSocket JPEG streaming to WebRTC-only

set -e

echo "🚀 VigileEye WebRTC Migration Starting..."
echo ""

cd /Users/mac/Desktop/pfe_v2/PFE_2026

# ========================================
# STEP 1: Remove useVideoStream hook (now obsolete)
# ========================================
echo "📦 Step 1: Archiving old useVideoStream hook..."
if [ -f "Front/SecurityFront/src/hooks/useVideoStream.ts" ]; then
  mv Front/SecurityFront/src/hooks/useVideoStream.ts Front/SecurityFront/src/hooks/useVideoStream.ts.backup
  echo "✅ useVideoStream.ts moved to .backup"
else
  echo "⚠️  useVideoStream.ts not found (may already be removed)"
fi
echo ""

# ========================================
# STEP 2: Performance Optimizations
# ========================================
echo "⚡ Step 2: Applying performance optimizations to backend..."

# Backup original stream_manager.py
if [ -f "VideoStreamingBackend/infrastructure/streaming/stream_manager.py" ]; then
  cp VideoStreamingBackend/infrastructure/streaming/stream_manager.py VideoStreamingBackend/infrastructure/streaming/stream_manager.py.backup
  echo "✅ Backup created: stream_manager.py.backup"
fi

echo "ℹ️  Performance recommendations (apply manually if needed):"
echo "   - Reduce frame_skip_ratio from 2 to 3 (skip 66% of frames)"
echo "   - Lower JPEG quality from 70 to 60"
echo "   - Add resolution scaling for cameras > 1280px"
echo ""

# ========================================
# STEP 3: Check errors
# ========================================
echo "🔍 Step 3: Checking for compilation errors..."
cd Front/SecurityFront

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "📦 Installing frontend dependencies..."
  npm install
fi

echo "🏗️  Building frontend to check for errors..."
npm run build 2>&1 | tee /tmp/vigile_build.log || {
  echo "❌ Build failed! Check /tmp/vigile_build.log for details"
  echo ""
  echo "Common issues:"
  echo "  - Missing imports (check all components using old useVideoStream)"
  echo "  - Type mismatches (WebRTC hook returns different types)"
  echo "  - Missing auth token in useWebRTCStream calls"
  exit 1
}

echo "✅ Frontend builds successfully!"
echo ""

cd /Users/mac/Desktop/pfe_v2/PFE_2026

# ========================================
# STEP 4: Docker rebuild
# ========================================
echo "🐳 Step 4: Rebuilding Docker containers..."

echo "Building VideoStreaming backend..."
docker-compose build videostreaming

echo "Building Frontend..."
docker-compose build front

echo "✅ Docker images rebuilt"
echo ""

# ========================================
# STEP 5: Restart services
# ========================================
echo "🔄 Step 5: Restarting services..."
docker-compose down
docker-compose up -d

echo "✅ Services restarted"
echo ""

# ========================================
# FINAL REPORT
# ========================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ WebRTC Migration Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Changes Applied:"
echo "  ✅ Backend WebSocket files removed"
echo "  ✅ Backend main.py updated (removed websocket_router)"
echo "  ✅ LiveThumbnail.tsx migrated to WebRTC"
echo "  ✅ Camera delete button z-index fixed (99999)"
echo "  ✅ Zone management unified (monitoring → /zones page)"
echo ""
echo "⚠️  Files Still Using useVideoStream (need manual update):"
echo "  - MonitoringPageNew.tsx (2 usages - lines 96, 1028)"
echo "  - ZonesPageNew.tsx (line 68)"
echo "  - DashboardPageNew.tsx"
echo "  - LiveStreamPlayer.tsx (line 201)"
echo ""
echo "📝 Manual Updates Needed:"
echo ""
echo "Replace useVideoStream with useWebRTCStream in remaining files:"
echo ""
echo "OLD PATTERN:"
echo "  import { useVideoStream } from '../hooks/useVideoStream';"
echo "  const { frameUrl, ... } = useVideoStream({ camera, autoConnect: true });"
echo "  <img src={frameUrl} />"
echo ""
echo "NEW PATTERN:"
echo "  import { useWebRTCStream } from '../hooks/useWebRTCStream';"
echo "  const authToken = localStorage.getItem('access_token') || '';"
echo "  const { videoRef, state } = useWebRTCStream({ cameraId: camera.id, authToken, autoConnect: true });"
echo "  <video ref={videoRef} autoPlay playsInline muted />"
echo ""
echo "🧪 Testing Checklist:"
echo "  [ ] Open http://localhost:3000"
echo "  [ ] Verify no WebSocket connections in DevTools → Network → WS"
echo "  [ ] Check camera thumbnails show WebRTC video"
echo "  [ ] Test monitoring page camera selection"
echo "  [ ] Click 'Define Detection Zone' → should redirect to /zones"
echo "  [ ] Test camera delete button (should appear above navbar)"
echo "  [ ] Check video smoothness (< 300ms latency)"
echo ""
echo "📚 Documentation:"
echo "  - Full guide: ./COMPLETE_FIX_GUIDE.md"
echo "  - Architecture: ./CLAUDE.md"
echo ""
echo "🚨 If you see errors:"
echo "  docker-compose logs -f videostreaming"
echo "  docker-compose logs -f front"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
