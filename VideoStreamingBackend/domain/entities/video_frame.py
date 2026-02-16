"""VideoFrame domain entity."""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Optional
from uuid import UUID


class FrameEncoding(str, Enum):
    """Supported frame encodings."""
    JPEG = "jpeg"
    PNG = "png"
    RAW = "raw"


@dataclass
class VideoFrame:
    """
    Represents a single video frame extracted from a stream.
    
    Attributes:
        camera_id: ID of the source camera
        timestamp: When the frame was captured
        frame_bytes: Encoded frame data
        width: Frame width in pixels
        height: Frame height in pixels
        encoding: Frame encoding format
        sequence: Frame sequence number in session
    """
    camera_id: UUID
    timestamp: datetime
    frame_bytes: bytes
    width: int
    height: int
    encoding: FrameEncoding = FrameEncoding.JPEG
    sequence: int = 0
    session_id: Optional[UUID] = None

    @classmethod
    def create(
        cls,
        camera_id: UUID,
        frame_bytes: bytes,
        width: int,
        height: int,
        encoding: FrameEncoding = FrameEncoding.JPEG,
        sequence: int = 0,
        session_id: Optional[UUID] = None,
    ) -> VideoFrame:
        """Factory method to create a new video frame."""
        return cls(
            camera_id=camera_id,
            timestamp=datetime.now(timezone.utc),
            frame_bytes=frame_bytes,
            width=width,
            height=height,
            encoding=encoding,
            sequence=sequence,
            session_id=session_id,
        )

    @property
    def size_bytes(self) -> int:
        """Get the size of the frame in bytes."""
        return len(self.frame_bytes)

    def to_base64(self) -> str:
        """Convert frame bytes to base64 string."""
        import base64
        return base64.b64encode(self.frame_bytes).decode("utf-8")

    def to_data_url(self) -> str:
        """Convert frame to data URL for browser display."""
        mime = "image/jpeg" if self.encoding == FrameEncoding.JPEG else "image/png"
        return f"data:{mime};base64,{self.to_base64()}"
