#!/bin/bash

# VigileEye - Deploy All Fixes Script
# This script rebuilds Docker containers with all streaming, zone, and UI fixes

set -e  # Exit on error

echo "🚀 VigileEye - Deploying All Fixes"
echo "=================================="
echo ""

# Color definitions
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker Desktop.${NC}"
    exit 1
fi

echo -e "${YELLOW}📦 Stopping existing containers...${NC}"
docker-compose down

echo ""
echo -e "${YELLOW}🔨 Building images with all fixes...${NC}"
echo "   - Zone save button visibility fix"
echo "   - Streaming support (YouTube/RTSP/HLS)"
echo "   - SSL database connections"
echo "   - FFmpeg + yt-dlp integration"
echo ""

docker-compose build --no-cache

echo ""
echo -e "${YELLOW}🚀 Starting services...${NC}"
docker-compose up -d

echo ""
echo -e "${YELLOW}⏳ Waiting for services to initialize (30 seconds)...${NC}"
sleep 10
echo "   - 25 seconds remaining..."
sleep 10
echo "   - 15 seconds remaining..."
sleep 10
echo "   - 5 seconds remaining..."
sleep 5

echo ""
echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo ""
echo "📊 Service Status:"
docker-compose ps

echo ""
echo "🌐 Access Points:"
echo "   - Frontend:     http://localhost:3000"
echo "   - Auth:         http://localhost:8000"
echo "   - Members:      http://localhost:8001"
echo "   - Cameras:      http://localhost:8002"
echo "   - Streaming:    http://localhost:8003"

echo ""
echo "📝 View Logs:"
echo "   docker-compose logs -f                  # All services"
echo "   docker-compose logs -f videostreaming   # Streaming only"
echo "   docker-compose logs -f cameramanagement # Camera mgmt only"
echo "   docker-compose logs -f front            # Frontend only"

echo ""
echo "🧪 Test Zone Creation:"
echo "   1. Navigate to http://localhost:3000/zones"
echo "   2. Click 'New Zone' → Fill details"
echo "   3. Click 'Draw Zone on Camera'"
echo "   4. Draw 4-point polygon"
echo "   5. Click 'Done' button"
echo "   6. ✅ Verify save button panel appears at bottom"
echo "   7. Click 'Create Zone' → Check success"

echo ""
echo -e "${GREEN}🎉 All fixes deployed successfully!${NC}"
