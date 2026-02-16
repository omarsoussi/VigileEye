"""Camera domain entity."""
from __future__ import annotations
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Optional, List
from uuid import UUID, uuid4


class CameraStatus(str, Enum):
    """Camera status enumeration."""
    ONLINE = "online"
    OFFLINE = "offline"
    DISABLED = "disabled"


class CameraType(str, Enum):
    """Camera type enumeration."""
    INDOOR = "indoor"
    OUTDOOR = "outdoor"
    THERMAL = "thermal"
    FISHEYE = "fisheye"
    PTZ = "ptz"  # Pan-Tilt-Zoom


@dataclass
class CameraLocation:
    """Camera location value object."""
    building: Optional[str] = None
    floor: Optional[str] = None
    zone: Optional[str] = None
    room: Optional[str] = None
    gps_lat: Optional[float] = None
    gps_long: Optional[float] = None


@dataclass
class Camera:
    """Camera domain entity."""
    id: UUID
    owner_user_id: UUID
    name: str
    description: Optional[str]
    stream_url: str
    protocol: str  # RTSP, HTTP, etc.
    username: Optional[str]
    password: Optional[str]  # Will be encrypted
    resolution: str  # e.g., "1080p", "4K"
    fps: int
    encoding: str  # H.264, H.265, etc.
    status: CameraStatus
    camera_type: CameraType
    is_active: bool
    location: Optional[CameraLocation] = None
    last_heartbeat: Optional[datetime] = None
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    @staticmethod
    def create(
        owner_user_id: UUID,
        name: str,
        stream_url: str,
        protocol: str,
        resolution: str,
        fps: int,
        encoding: str,
        camera_type: CameraType,
        description: Optional[str] = None,
        username: Optional[str] = None,
        password: Optional[str] = None,
        location: Optional[CameraLocation] = None,
    ) -> Camera:
        """Factory method to create a new camera."""
        return Camera(
            id=uuid4(),
            owner_user_id=owner_user_id,
            name=name,
            description=description,
            stream_url=stream_url,
            protocol=protocol,
            username=username,
            password=password,
            resolution=resolution,
            fps=fps,
            encoding=encoding,
            status=CameraStatus.OFFLINE,
            camera_type=camera_type,
            is_active=True,
            location=location,
            last_heartbeat=None,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )

    def disable(self):
        """Disable the camera."""
        self.status = CameraStatus.DISABLED
        self.is_active = False
        self.updated_at = datetime.now(timezone.utc)

    def enable(self):
        """Enable the camera."""
        self.is_active = True
        self.status = CameraStatus.OFFLINE
        self.updated_at = datetime.now(timezone.utc)

    def mark_online(self):
        """Mark camera as online."""
        self.status = CameraStatus.ONLINE
        self.last_heartbeat = datetime.now(timezone.utc)
        self.updated_at = datetime.now(timezone.utc)

    def mark_offline(self):
        """Mark camera as offline."""
        if self.is_active:
            self.status = CameraStatus.OFFLINE
        self.updated_at = datetime.now(timezone.utc)

    def update_config(
        self,
        name: Optional[str] = None,
        description: Optional[str] = None,
        stream_url: Optional[str] = None,
        resolution: Optional[str] = None,
        fps: Optional[int] = None,
        encoding: Optional[str] = None,
        location: Optional[CameraLocation] = None,
    ):
        """Update camera configuration."""
        if name is not None:
            self.name = name
        if description is not None:
            self.description = description
        if stream_url is not None:
            self.stream_url = stream_url
        if resolution is not None:
            self.resolution = resolution
        if fps is not None:
            self.fps = fps
        if encoding is not None:
            self.encoding = encoding
        if location is not None:
            self.location = location
        self.updated_at = datetime.now(timezone.utc)
