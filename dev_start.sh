#!/bin/bash

# VigileEye - Development Mode Startup Script
# Starts all services locally (no Docker) for testing fixes

echo "🚀 VigileEye - Starting Development Servers"
echo "==========================================="
echo ""

# Color definitions
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check Python version
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python 3 not found. Please install Python 3.11+${NC}"
    exit 1
fi

PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
echo -e "${GREEN}✅ Python $PYTHON_VERSION detected${NC}"

# Check Node version
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found. Please install Node.js 18+${NC}"
    exit 1
fi

NODE_VERSION=$(node --version)
echo -e "${GREEN}✅ Node $NODE_VERSION detected${NC}"

echo ""
echo -e "${YELLOW}📦 Installing dependencies...${NC}"

# Frontend dependencies
echo "   - Installing frontend dependencies..."
cd Front/SecurityFront
npm install --silent
cd ../..

echo ""
echo -e "${YELLOW}🚀 Starting services in background...${NC}"

# Start backends
echo "   - Starting Auth Backend (port 8000)..."
cd Backend
python3 main.py > ../logs/auth.log 2>&1 &
AUTH_PID=$!
cd ..

sleep 2

echo "   - Starting Camera Management Backend (port 8002)..."
cd CameraManagementBackend
python3 main.py > ../logs/camera.log 2>&1 &
CAMERA_PID=$!
cd ..

sleep 2

echo "   - Starting Members Invitation Backend (port 8001)..."
cd MembersInvitationBackend
python3 main.py > ../logs/members.log 2>&1 &
MEMBERS_PID=$!
cd ..

sleep 2

echo "   - Starting Video Streaming Backend (port 8003)..."
cd VideoStreamingBackend
python3 main.py > ../logs/streaming.log 2>&1 &
STREAMING_PID=$!
cd ..

sleep 3

echo "   - Starting Frontend (port 3000)..."
cd Front/SecurityFront
npm start > ../../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
cd ../..

echo ""
echo -e "${GREEN}✅ All services started!${NC}"
echo ""
echo "📋 Process IDs:"
echo "   - Auth:       $AUTH_PID"
echo "   - Camera:     $CAMERA_PID"
echo "   - Members:    $MEMBERS_PID"
echo "   - Streaming:  $STREAMING_PID"
echo "   - Frontend:   $FRONTEND_PID"

echo ""
echo "🌐 Access Points:"
echo "   - Frontend:     http://localhost:3000"
echo "   - Auth:         http://localhost:8000/docs"
echo "   - Members:      http://localhost:8001/docs"
echo "   - Cameras:      http://localhost:8002/docs"
echo "   - Streaming:    http://localhost:8003/docs"

echo ""
echo "📝 View Logs:"
echo "   tail -f logs/auth.log"
echo "   tail -f logs/camera.log"
echo "   tail -f logs/streaming.log"
echo "   tail -f logs/frontend.log"

echo ""
echo "🛑 Stop Services:"
echo "   kill $AUTH_PID $CAMERA_PID $MEMBERS_PID $STREAMING_PID $FRONTEND_PID"
echo "   Or use: pkill -f 'python3 main.py' && pkill -f 'npm start'"

echo ""
echo -e "${YELLOW}⏳ Waiting for services to be ready (15 seconds)...${NC}"
sleep 15

echo ""
echo -e "${GREEN}🎉 Development environment ready!${NC}"
echo ""
echo "🧪 Test the Save Button Fix:"
echo "   1. Open http://localhost:3000/zones"
echo "   2. Create new zone"
echo "   3. Draw polygon (4 points)"
echo "   4. Click 'Done'"
echo "   5. ✅ Save button panel should appear at bottom!"

# Save PIDs to file for easy cleanup
echo "$AUTH_PID $CAMERA_PID $MEMBERS_PID $STREAMING_PID $FRONTEND_PID" > .dev_pids

echo ""
echo "Press Ctrl+C to stop all services"
wait
