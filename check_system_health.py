#!/usr/bin/env python3
"""
System Health Check Script for VigileEye WebRTC Streaming

Tests all backend services and verifies configuration.
Run this after installation to ensure everything is working.
"""

import sys
import asyncio
import httpx
from typing import Dict, List, Tuple

# Service endpoints
SERVICES = {
    "Auth": "http://localhost:8000",
    "Camera Management": "http://localhost:8002",
    "Members Invitation": "http://localhost:8001",
    "Video Streaming": "http://localhost:8003",
}

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    RESET = '\033[0m'
    BOLD = '\033[1m'

def print_header(text: str):
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'=' * 60}{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.BLUE}{text:^60}{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'=' * 60}{Colors.RESET}\n")

def print_success(text: str):
    print(f"{Colors.GREEN}✓ {text}{Colors.RESET}")

def print_error(text: str):
    print(f"{Colors.RED}✗ {text}{Colors.RESET}")

def print_warning(text: str):
    print(f"{Colors.YELLOW}⚠ {text}{Colors.RESET}")

def print_info(text: str):
    print(f"{Colors.BLUE}ℹ {text}{Colors.RESET}")

async def check_service_health(name: str, base_url: str) -> Tuple[bool, str]:
    """Check if a service is responding to health checks."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{base_url}/health")
            
            if response.status_code == 200:
                data = response.json() if response.headers.get("content-type", "").startswith("application/json") else {}
                return True, f"Healthy (status: {data.get('status', 'ok')})"
            else:
                return False, f"HTTP {response.status_code}"
                
    except httpx.ConnectError:
        return False, "Connection refused (service not running)"
    except httpx.TimeoutException:
        return False, "Request timeout"
    except Exception as e:
        return False, f"Error: {str(e)}"

async def check_streaming_specific(base_url: str) -> Dict[str, any]:
    """Check streaming-specific endpoints."""
    results = {}
    
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            # Check stats endpoint
            try:
                response = await client.get(f"{base_url}/api/v1/streams/stats")
                if response.status_code == 200:
                    data = response.json()
                    results["stats"] = {
                        "success": True,
                        "active_connections": data.get("active_connections", 0),
                        "active_sessions": data.get("active_sessions", 0),
                    }
                else:
                    results["stats"] = {"success": False, "error": f"HTTP {response.status_code}"}
            except Exception as e:
                results["stats"] = {"success": False, "error": str(e)}
            
            # Check active streams endpoint
            try:
                response = await client.get(f"{base_url}/api/v1/streams/active")
                if response.status_code == 200:
                    data = response.json()
                    results["active_streams"] = {
                        "success": True,
                        "count": len(data) if isinstance(data, list) else 0,
                    }
                else:
                    results["active_streams"] = {"success": False, "error": f"HTTP {response.status_code}"}
            except Exception as e:
                results["active_streams"] = {"success": False, "error": str(e)}
                
    except Exception as e:
        results["error"] = str(e)
    
    return results

def check_python_version():
    """Check Python version."""
    version = sys.version_info
    if version.major == 3 and version.minor >= 11:
        print_success(f"Python {version.major}.{version.minor}.{version.micro}")
        return True
    else:
        print_error(f"Python {version.major}.{version.minor}.{version.micro} (requires 3.11+)")
        return False

def check_required_packages():
    """Check if required Python packages are installed."""
    required = [
        "fastapi",
        "uvicorn",
        "sqlalchemy",
        "alembic",
        "aiortc",
        "httpx",
        "cv2",  # opencv-python
    ]
    
    optional = [
        "av",  # PyAV for video processing
    ]
    
    all_good = True
    
    for package in required:
        try:
            __import__(package)
            print_success(f"{package} installed")
        except ImportError:
            print_error(f"{package} NOT installed (required)")
            all_good = False
    
    for package in optional:
        try:
            __import__(package)
            print_success(f"{package} installed")
        except ImportError:
            print_warning(f"{package} NOT installed (optional, but recommended)")
    
    return all_good

def check_ffmpeg():
    """Check if FFmpeg is installed and has H.264 support."""
    import subprocess
    
    try:
        # Check FFmpeg version
        result = subprocess.run(
            ["ffmpeg", "-version"],
            capture_output=True,
            text=True,
            timeout=5
        )
        
        if result.returncode == 0:
            version_line = result.stdout.split('\n')[0]
            print_success(f"FFmpeg: {version_line}")
            
            # Check for H.264 codec
            codec_result = subprocess.run(
                ["ffmpeg", "-codecs"],
                capture_output=True,
                text=True,
                timeout=5
            )
            
            if "h264" in codec_result.stdout.lower():
                print_success("H.264 codec available")
            else:
                print_warning("H.264 codec not found")
            
            # Check for NVENC (GPU encoding)
            if "nvenc" in codec_result.stdout.lower() or "h264_nvenc" in codec_result.stdout.lower():
                print_success("NVENC (GPU encoding) available")
            else:
                print_info("NVENC not available (CPU encoding will be used)")
            
            return True
        else:
            print_error("FFmpeg not working properly")
            return False
            
    except FileNotFoundError:
        print_error("FFmpeg not found in PATH")
        return False
    except subprocess.TimeoutExpired:
        print_error("FFmpeg command timeout")
        return False
    except Exception as e:
        print_error(f"Error checking FFmpeg: {str(e)}")
        return False

async def main():
    """Run all system health checks."""
    
    print_header("VigileEye WebRTC Streaming - System Health Check")
    
    # 1. Check Python version
    print_info("Checking Python version...")
    python_ok = check_python_version()
    
    # 2. Check required packages
    print_info("\nChecking Python packages...")
    packages_ok = check_required_packages()
    
    # 3. Check FFmpeg
    print_info("\nChecking FFmpeg installation...")
    ffmpeg_ok = check_ffmpeg()
    
    # 4. Check backend services
    print_header("Backend Services Health")
    
    services_status = {}
    for name, url in SERVICES.items():
        print_info(f"Checking {name}...")
        is_healthy, message = await check_service_health(name, url)
        services_status[name] = is_healthy
        
        if is_healthy:
            print_success(f"{name}: {message}")
        else:
            print_error(f"{name}: {message}")
    
    # 5. Check streaming-specific features
    if services_status.get("Video Streaming"):
        print_header("Video Streaming Service Details")
        
        streaming_results = await check_streaming_specific(SERVICES["Video Streaming"])
        
        if "stats" in streaming_results:
            if streaming_results["stats"]["success"]:
                print_success(f"Stats endpoint: {streaming_results['stats']['active_connections']} active connections, "
                            f"{streaming_results['stats']['active_sessions']} active sessions")
            else:
                print_error(f"Stats endpoint: {streaming_results['stats']['error']}")
        
        if "active_streams" in streaming_results:
            if streaming_results["active_streams"]["success"]:
                print_success(f"Active streams: {streaming_results['active_streams']['count']}")
            else:
                print_error(f"Active streams: {streaming_results['active_streams']['error']}")
    
    # Summary
    print_header("Summary")
    
    all_services_ok = all(services_status.values())
    
    if python_ok and packages_ok and ffmpeg_ok and all_services_ok:
        print_success("✓ All checks passed! System is ready for streaming.")
        print_info("\nNext steps:")
        print("  1. Add cameras via Camera Management API")
        print("  2. Test WebRTC connection in frontend")
        print("  3. See QUICKSTART.md for usage examples")
        return 0
    else:
        print_error("✗ Some checks failed. Please fix the issues above.")
        print_info("\nTroubleshooting:")
        
        if not python_ok:
            print("  - Upgrade Python to 3.11+")
        
        if not packages_ok:
            print("  - Run: cd VideoStreamingBackend && pip install -r requirements.txt")
        
        if not ffmpeg_ok:
            print("  - macOS: brew install ffmpeg")
            print("  - Ubuntu: sudo apt-get install ffmpeg")
        
        if not all_services_ok:
            for name, status in services_status.items():
                if not status:
                    print(f"  - Start {name} service (see QUICKSTART.md)")
        
        return 1

if __name__ == "__main__":
    try:
        exit_code = asyncio.run(main())
        sys.exit(exit_code)
    except KeyboardInterrupt:
        print_warning("\nHealth check interrupted by user")
        sys.exit(130)
    except Exception as e:
        print_error(f"\nUnexpected error: {str(e)}")
        sys.exit(1)
