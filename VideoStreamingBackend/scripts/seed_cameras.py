"""
Seed script to add test cameras to the Camera Management database.

This script adds real public RTSP camera streams for testing the Video Streaming service.

Run: python scripts/seed_cameras.py
"""
import sys
from pathlib import Path
from uuid import uuid4
from datetime import datetime, timezone

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "CameraManagementBackend"))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Camera Management DB connection
CAMERA_DB_URL = "postgresql+pg8000://cmCamerasMgmt:CameraMgmt%40admin@localhost:5432/CMcamerasMgmt"


def seed_cameras():
    """Add test cameras to the Camera Management database."""
    from infrastructure.persistence.models.camera_model import CameraModel
    from infrastructure.persistence.database import Base
    
    engine = create_engine(CAMERA_DB_URL)
    Session = sessionmaker(bind=engine)
    db = Session()
    
    # Test user ID (you should replace with a real user ID from your Auth DB)
    test_user_id = uuid4()
    
    # Public RTSP streams for testing (these are commonly available test streams)
    test_cameras = [
        {
            "id": uuid4(),
            "owner_user_id": test_user_id,
            "name": "Office Entrance",
            "description": "Main entrance camera - lobby area",
            "stream_url": "rtsp://wowzaec2demo.streamlock.net/vod/mp4:BigBuckBunny_115k.mp4",
            "protocol": "rtsp",
            "resolution": "1280x720",
            "fps": 15,
            "encoding": "h264",
            "status": "offline",
            "camera_type": "indoor",
            "is_active": True,
            "building": "Main Building",
            "floor": "1",
            "zone": "Entrance",
        },
        {
            "id": uuid4(),
            "owner_user_id": test_user_id,
            "name": "Parking Lot A",
            "description": "North parking lot overview",
            "stream_url": "rtsp://wowzaec2demo.streamlock.net/vod/mp4:BigBuckBunny_115k.mp4",
            "protocol": "rtsp",
            "resolution": "1920x1080",
            "fps": 10,
            "encoding": "h264",
            "status": "offline",
            "camera_type": "outdoor",
            "is_active": True,
            "building": "Parking",
            "zone": "Lot A",
        },
        {
            "id": uuid4(),
            "owner_user_id": test_user_id,
            "name": "Server Room",
            "description": "Data center server room thermal camera",
            "stream_url": "rtsp://wowzaec2demo.streamlock.net/vod/mp4:BigBuckBunny_115k.mp4",
            "protocol": "rtsp",
            "resolution": "640x480",
            "fps": 5,
            "encoding": "h264",
            "status": "offline",
            "camera_type": "thermal",
            "is_active": True,
            "building": "Data Center",
            "floor": "B1",
            "zone": "Server Room",
        },
        {
            "id": uuid4(),
            "owner_user_id": test_user_id,
            "name": "Warehouse Overview",
            "description": "Full warehouse fisheye view",
            "stream_url": "rtsp://wowzaec2demo.streamlock.net/vod/mp4:BigBuckBunny_115k.mp4",
            "protocol": "rtsp",
            "resolution": "2048x2048",
            "fps": 15,
            "encoding": "h264",
            "status": "offline",
            "camera_type": "fisheye",
            "is_active": True,
            "building": "Warehouse",
            "floor": "1",
        },
        {
            "id": uuid4(),
            "owner_user_id": test_user_id,
            "name": "Perimeter PTZ",
            "description": "Perimeter patrol PTZ camera",
            "stream_url": "rtsp://wowzaec2demo.streamlock.net/vod/mp4:BigBuckBunny_115k.mp4",
            "protocol": "rtsp",
            "resolution": "1920x1080",
            "fps": 30,
            "encoding": "h264",
            "status": "offline",
            "camera_type": "ptz",
            "is_active": True,
            "zone": "Perimeter",
        },
    ]
    
    now = datetime.now(timezone.utc)
    
    for cam_data in test_cameras:
        camera = CameraModel(
            id=cam_data["id"],
            owner_user_id=cam_data["owner_user_id"],
            name=cam_data["name"],
            description=cam_data.get("description"),
            stream_url=cam_data["stream_url"],
            protocol=cam_data["protocol"],
            resolution=cam_data["resolution"],
            fps=cam_data["fps"],
            encoding=cam_data["encoding"],
            status=cam_data["status"],
            camera_type=cam_data["camera_type"],
            is_active=cam_data["is_active"],
            building=cam_data.get("building"),
            floor=cam_data.get("floor"),
            zone=cam_data.get("zone"),
            created_at=now,
            updated_at=now,
        )
        db.add(camera)
        print(f"Added camera: {cam_data['name']} ({cam_data['id']})")
    
    db.commit()
    print(f"\n✅ Added {len(test_cameras)} test cameras")
    print(f"Test user ID: {test_user_id}")
    
    db.close()


if __name__ == "__main__":
    seed_cameras()
