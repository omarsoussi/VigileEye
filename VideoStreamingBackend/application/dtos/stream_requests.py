"""Request DTOs for streaming."""
from typing import Optional
from pydantic import BaseModel, Field, HttpUrl


class StreamConfigRequest(BaseModel):
    """Configuration options for a stream."""
    fps: int = Field(default=15, ge=1, le=60, description="Frames per second")
    quality: int = Field(default=85, ge=1, le=100, description="JPEG quality")
    width: Optional[int] = Field(default=None, ge=1, description="Target width")
    height: Optional[int] = Field(default=None, ge=1, description="Target height")


class StartStreamRequest(BaseModel):
    """Request to start a video stream."""
    camera_id: str = Field(..., description="Camera UUID")
    stream_url: str = Field(..., description="RTSP or HTTP stream URL")
    config: Optional[StreamConfigRequest] = Field(
        default=None,
        description="Optional stream configuration"
    )
    force_restart: bool = Field(
        default=False,
        description="Force restart even if stream is active"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "camera_id": "123e4567-e89b-12d3-a456-426614174000",
                "stream_url": "rtsp://192.168.1.100:554/stream1",
                "config": {
                    "fps": 15,
                    "quality": 85
                },
                "force_restart": False
            }
        }


class StopStreamRequest(BaseModel):
    """Request to stop a video stream."""
    camera_id: str = Field(..., description="Camera UUID")

    class Config:
        json_schema_extra = {
            "example": {
                "camera_id": "123e4567-e89b-12d3-a456-426614174000"
            }
        }
