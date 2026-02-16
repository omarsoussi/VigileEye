"""Request DTOs for camera management."""
from typing import Optional, List
from pydantic import BaseModel, HttpUrl
from domain.entities.camera import CameraType


class CameraLocationRequest(BaseModel):
    """Camera location request DTO."""
    building: Optional[str] = None
    floor: Optional[str] = None
    zone: Optional[str] = None
    room: Optional[str] = None
    gps_lat: Optional[float] = None
    gps_long: Optional[float] = None


class CreateCameraRequest(BaseModel):
    """Request to create a new camera."""
    name: str
    description: Optional[str] = None
    stream_url: str
    protocol: str  # RTSP, HTTP
    username: Optional[str] = None
    password: Optional[str] = None
    resolution: str  # 1080p, 4K, etc.
    fps: int
    encoding: str  # H.264, H.265
    camera_type: CameraType
    location: Optional[CameraLocationRequest] = None


class UpdateCameraRequest(BaseModel):
    """Request to update a camera."""
    name: Optional[str] = None
    description: Optional[str] = None
    stream_url: Optional[str] = None
    resolution: Optional[str] = None
    fps: Optional[int] = None
    encoding: Optional[str] = None
    location: Optional[CameraLocationRequest] = None


class GrantAccessRequest(BaseModel):
    """Request to grant access to a camera."""
    user_id: str  # Email or UUID
    permission: str = "view"  # view or manage


class RecordHealthRequest(BaseModel):
    """Request to record camera health."""
    latency_ms: int = 0
    frame_drop_rate: float = 0.0
    uptime_percentage: float = 100.0
