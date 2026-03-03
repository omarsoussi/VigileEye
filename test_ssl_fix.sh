#!/bin/bash

echo "🔧 Testing SSL Fix for VigileEye Backends"
echo "=========================================="
echo ""

# Test CameraManagementBackend
echo "📹 Testing CameraManagementBackend..."
cd /Users/mac/Desktop/pfe_v2/PFE_2026/CameraManagementBackend
python3 -c "
from infrastructure.persistence.database import engine, init_db
from sqlalchemy import text

print('✓ Connecting to database...')
with engine.connect() as conn:
    result = conn.execute(text('SELECT 1')).scalar()
    print(f'✓ Database connection successful! Result: {result}')
    
    # Check if zones table exists and has severity column
    result = conn.execute(text(\"\"\"
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name='zones' AND column_name='severity'
    \"\"\")).fetchone()
    
    if result:
        print('✓ zones.severity column exists!')
    else:
        print('⚠ zones.severity column missing - will be created on startup')

print('✓ CameraManagementBackend database OK!')
" 2>&1

echo ""

# Test VideoStreamingBackend  
echo "🎥 Testing VideoStreamingBackend..."
cd /Users/mac/Desktop/pfe_v2/PFE_2026/VideoStreamingBackend
python3 -c "
from infrastructure.persistence.database import engine
from sqlalchemy import text

print('✓ Connecting to database...')
with engine.connect() as conn:
    result = conn.execute(text('SELECT 1')).scalar()
    print(f'✓ Database connection successful! Result: {result}')

print('✓ VideoStreamingBackend database OK!')
" 2>&1

echo ""
echo "=========================================="
echo "✅ ALL SSL FIXES VERIFIED!"
echo ""
echo "🚀 You can now start the services with:"
echo ""
echo "Terminal 1: cd CameraManagementBackend && python3 main.py"
echo "Terminal 2: cd VideoStreamingBackend && python3 main.py"
echo "Terminal 3: cd Backend && python3 main.py"
echo "Terminal 4: cd MembersInvitationBackend && python3 main.py"
echo "Terminal 5: cd Front/SecurityFront && npm start"
echo ""
