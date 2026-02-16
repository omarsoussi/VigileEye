"""SQLAlchemy StreamSession model."""
from uuid import uuid4

from sqlalchemy import Column, DateTime, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID, ENUM

from domain.entities.stream_session import StreamStatus
from infrastructure.persistence.database import Base


# Create PostgreSQL ENUM with lowercase values matching the domain enum
stream_status_enum = ENUM(
    'pending', 'connecting', 'active', 'reconnecting', 'stopped', 'error',
    name='stream_status',
    create_type=False,  # Type already exists in DB
)


class StreamSessionModel(Base):
    """SQLAlchemy model for stream sessions."""

    __tablename__ = "stream_sessions"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    camera_id = Column(PG_UUID(as_uuid=True), nullable=False, index=True)
    stream_url = Column(String(500), nullable=False)
    status = Column(
        stream_status_enum,
        nullable=False,
        default='pending',
    )
    fps = Column(Integer, nullable=False, default=15)
    started_at = Column(DateTime(timezone=True), nullable=True)
    last_frame_at = Column(DateTime(timezone=True), nullable=True)
    stopped_at = Column(DateTime(timezone=True), nullable=True)
    error_message = Column(String(1000), nullable=True)
    reconnect_attempts = Column(Integer, nullable=False, default=0)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    def __repr__(self) -> str:
        return f"<StreamSession(id={self.id}, camera_id={self.camera_id}, status={self.status})>"
