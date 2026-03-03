#!/usr/bin/env python3
"""
Test camera URLs to identify which ones are broken.

Usage:
    python scripts/test_camera_urls.py
"""
import asyncio
import sys
import subprocess
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from infrastructure.config.settings import get_settings
from infrastructure.external.camera_api_client import camera_api_client
from sqlalchemy import create_engine, text


async def test_camera_urls():
    """Test all camera URLs and report which ones are broken."""
    settings = get_settings()
    
    print("=" * 80)
    print("🔍 Camera URL Diagnostic Tool")
    print("=" * 80)
    print()
    
    # Get cameras from Camera Management API
    print("📋 Fetching cameras from Camera Management service...")
    print(f"   Camera API URL: {settings.camera_api_url}")
    print()
    
    # Since we need auth, let's directly query the Camera Management database
    print("⚠️  Note: This script must be run from CameraManagementBackend directory")
    print("   Or run with: docker exec pfe_2026-cameramanagement-1 python scripts/test_camera_urls.py")
    print()
    
    try:
        from infrastructure.persistence.database import SessionLocal
        db = SessionLocal()
        
        from sqlalchemy import text
        result = db.execute(text("""
            SELECT c.id, c.name, c.stream_url, c.is_active, c.owner_user_id
            FROM cameras c
            WHERE c.is_active = true
            ORDER BY c.created_at DESC
        """))
        
        cameras = []
        for row in result:
            cameras.append({
                'id': row[0],
                'name': row[1],
                'stream_url': row[2],
                'is_active': row[3],
                'owner_id': row[4]
            })
        
        db.close()
    except Exception as e:
        print(f"❌ Error connecting to database: {e}")
        print()
        print("Make sure you run this from the correct backend directory:")
        print("  cd CameraManagementBackend && python scripts/test_camera_urls.py")
        return
    
    if not cameras:
        print("⚠️  No active cameras found in database")
        return
    
    print(f"✅ Found {len(cameras)} active camera(s)")
    print()
    
    # Test each camera URL
    for i, camera in enumerate(cameras, 1):
        print(f"🎥 Camera {i}/{len(cameras)}: {camera['name']}")
        print(f"   ID: {camera['id']}")
        print(f"   Owner ID: {camera['owner_id']}")
        print(f"   URL: {camera['stream_url'][:100]}")
        
        # Test URL with ffprobe (lighter than ffmpeg)
        print(f"   Testing connection with ffprobe...")
        
        cmd = [
            'ffprobe',
            '-v', 'error',
            '-timeout', '10000000',  # 10 seconds
            '-rtsp_transport', 'tcp',
            '-show_entries', 'format=duration,bit_rate',
            '-of', 'default=noprint_wrappers=1',
            camera['stream_url']
        ]
        
        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=12
            )
            
            if result.returncode == 0:
                print(f"   ✅ SUCCESS - Stream is reachable")
                if result.stdout:
                    print(f"      {result.stdout.strip()}")
            else:
                print(f"   ❌ FAILED - Cannot connect to stream")
                if result.stderr:
                    # Show first few lines of error
                    error_lines = result.stderr.strip().split('\n')[:5]
                    for line in error_lines:
                        if line.strip():
                            print(f"      Error: {line.strip()}")
                
                # Common issues and suggestions
                if '404' in result.stderr or 'Not Found' in result.stderr:
                    print(f"      💡 This URL returns 404 Not Found - the stream no longer exists")
                elif 'Connection refused' in result.stderr:
                    print(f"      💡 Connection refused - check firewall or server is down")
                elif 'timed out' in result.stderr or 'timeout' in result.stderr.lower():
                    print(f"      💡 Connection timeout - server not responding or wrong URL")
                elif 'SSL' in result.stderr or 'certificate' in result.stderr:
                    print(f"      💡 SSL/certificate error - try HTTP instead of HTTPS")
                
        except subprocess.TimeoutExpired:
            print(f"   ⏱️  TIMEOUT - Stream took too long to respond (>10s)")
        except Exception as e:
            print(f"   ❌ ERROR - {str(e)}")
        
        print()
    
    print("=" * 80)
    print("📝 Summary")
    print("=" * 80)
    print()
    print("If cameras are failing, try these working test URLs:")
    print()
    print("✅ Big Buck Bunny (RTSP, always available):")
    print("   rtsp://wowzaec2demo.streamlock.net/vod/mp4:BigBuckBunny_115k.mp4")
    print()
    print("✅ HLS test stream:")
    print("   https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8")
    print()
    print("✅ Sintel test stream (HLS):")
    print("   https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8")
    print()
    print("💡 To update a camera URL:")
    print("   1. Go to http://localhost:3000/cameras")
    print("   2. Click Edit on the broken camera")
    print("   3. Update the Stream URL")
    print("   4. Click Save")
    print()


if __name__ == '__main__':
    asyncio.run(test_camera_urls())
