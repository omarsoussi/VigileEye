"""Response DTOs for streaming."""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class StreamSessionResponse(BaseModel):
    """Response containing stream session details."""
    id: str
    camera_id: str
    status: str
    fps: int
    started_at: Optional[datetime] = None
    last_frame_at: Optional[datetime] = None
    error_message: Optional[str] = None
    reconnect_attempts: int = 0
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class StreamStatusResponse(BaseModel):
    """Response for stream status query."""
    camera_id: str
    is_streaming: bool
    status: str
    session: Optional[StreamSessionResponse] = None
    websocket_url: Optional[str] = None


class ActiveStreamsResponse(BaseModel):
    """Response containing all active streams."""
    count: int
    streams: List[StreamSessionResponse]


class MessageResponse(BaseModel):
    """Generic message response."""
    message: str
    success: bool = True


class FrameMetadata(BaseModel):
    """Metadata sent with each frame via WebSocket."""
    camera_id: str
    timestamp: str
    sequence: int
    width: int
    height: int
    encoding: str
