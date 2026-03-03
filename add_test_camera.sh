#!/bin/bash
# Add a test camera with a working HLS stream
# Usage: ./add_test_camera.sh <your_jwt_token>

if [ -z "$1" ]; then
  echo "❌ Error: Please provide your JWT token"
  echo "Usage: ./add_test_camera.sh <your_jwt_token>"
  echo ""
  echo "To get your token:"
  echo "1. Open browser DevTools (F12)"
  echo "2. Go to Application > Local Storage > http://localhost:3000"
  echo "3. Copy the 'access_token' value"
  exit 1
fi

TOKEN="$1"

echo "🎥 Adding test camera with working HLS stream..."

curl -X POST http://localhost:8002/api/v1/cameras \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Camera - Sintel HLS",
    "description": "Test stream for WebRTC verification",
    "stream_url": "https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8",
    "location": {
      "building": "Test Site",
      "zone": "Demo Zone",
      "floor": "Virtual"
    },
    "camera_type": "fixed",
    "is_active": true,
    "resolution": "1080p",
    "fps": 30
  }' | python3 -m json.tool

echo ""
echo "✅ Camera added! Go to http://localhost:3000/monitoring to see the live stream"
echo "🎬 The video should start streaming automatically with WebRTC"
