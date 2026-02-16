"""StreamSession domain entity."""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Optional
from uuid import UUID, uuid4


class StreamStatus(str, Enum):
    """Status of a stream session."""
    PENDING = "pending"
    CONNECTING = "connecting"
    ACTIVE = "active"
    RECONNECTING = "reconnecting"
    STOPPED = "stopped"
    ERROR = "error"


@dataclass
class StreamSession:
    """
    Represents an active video streaming session for a camera.
    
    Attributes:
        id: Unique session identifier
        camera_id: ID of the camera being streamed
        stream_url: URL of the camera stream (RTSP/HTTP)
        status: Current session status
        fps: Frames per second
        started_at: When the session started
        last_frame_at: Timestamp of last received frame
        error_message: Error details if status is ERROR
        reconnect_attempts: Number of reconnection attempts
    """
    id: UUID
    camera_id: UUID
    stream_url: str
    status: StreamStatus = StreamStatus.PENDING
    fps: int = 15
    started_at: Optional[datetime] = None
    last_frame_at: Optional[datetime] = None
    stopped_at: Optional[datetime] = None
    error_message: Optional[str] = None
    reconnect_attempts: int = 0
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    @classmethod
    def create(
        cls,
        camera_id: UUID,
        stream_url: str,
        fps: int = 15,
    ) -> StreamSession:
        """Factory method to create a new stream session."""
        now = datetime.now(timezone.utc)
        return cls(
            id=uuid4(),
            camera_id=camera_id,
            stream_url=stream_url,
            fps=fps,
            status=StreamStatus.PENDING,
            created_at=now,
            updated_at=now,
        )

    def start(self) -> None:
        """Mark the session as started."""
        self.status = StreamStatus.CONNECTING
        self.started_at = datetime.now(timezone.utc)
        self.updated_at = datetime.now(timezone.utc)

    def activate(self) -> None:
        """Mark the session as active (receiving frames)."""
        self.status = StreamStatus.ACTIVE
        self.updated_at = datetime.now(timezone.utc)

    def stop(self) -> None:
        """Stop the session."""
        self.status = StreamStatus.STOPPED
        self.stopped_at = datetime.now(timezone.utc)
        self.updated_at = datetime.now(timezone.utc)

    def mark_error(self, message: str) -> None:
        """Mark the session as errored."""
        self.status = StreamStatus.ERROR
        self.error_message = message
        self.updated_at = datetime.now(timezone.utc)

    def mark_reconnecting(self) -> None:
        """Mark the session as reconnecting."""
        self.status = StreamStatus.RECONNECTING
        self.reconnect_attempts += 1
        self.updated_at = datetime.now(timezone.utc)

    def update_last_frame(self) -> None:
        """Update the last frame timestamp."""
        self.last_frame_at = datetime.now(timezone.utc)
        self.updated_at = datetime.now(timezone.utc)

    def is_alive(self, timeout_seconds: int = 30) -> bool:
        """Check if the session is still receiving frames."""
        if self.status not in (StreamStatus.ACTIVE, StreamStatus.RECONNECTING):
            return False
        if self.last_frame_at is None:
            return False
        elapsed = (datetime.now(timezone.utc) - self.last_frame_at).total_seconds()
        return elapsed < timeout_seconds
