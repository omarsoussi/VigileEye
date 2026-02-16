"""Response DTOs for camera management."""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel


class CameraLocationResponse(BaseModel):
    """Camera location response DTO."""
    building: Optional[str] = None
    floor: Optional[str] = None
    zone: Optional[str] = None
    room: Optional[str] = None
    gps_lat: Optional[float] = None
    gps_long: Optional[float] = None


class CameraResponse(BaseModel):
    """Response DTO for a camera."""
    id: str
    owner_user_id: str
    name: str
    description: Optional[str]
    stream_url: str
    protocol: str
    resolution: str
    fps: int
    encoding: str
    status: str
    camera_type: str
    is_active: bool
    location: Optional[CameraLocationResponse]
    last_heartbeat: Optional[datetime]
    created_at: datetime
    updated_at: datetime


class CameraHealthResponse(BaseModel):
    """Response DTO for camera health."""
    camera_id: str
    last_heartbeat: datetime
    latency_ms: int
    frame_drop_rate: float
    uptime_percentage: float
    recorded_at: datetime


class CameraAccessResponse(BaseModel):
    """Response DTO for camera access."""
    camera_id: str
    user_id: str
    permission: str
    granted_at: datetime


class MessageResponse(BaseModel):
    """Generic message response."""
    message: str
    success: bool = True
