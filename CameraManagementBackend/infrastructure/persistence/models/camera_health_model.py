"""SQLAlchemy CameraHealth model."""
from uuid import uuid4
from sqlalchemy import Column, ForeignKey, Integer, Float, DateTime, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import relationship
from infrastructure.persistence.database import Base


class CameraHealthModel(Base):
    """SQLAlchemy model for camera health monitoring."""
    __tablename__ = "camera_health"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    camera_id = Column(PG_UUID(as_uuid=True), ForeignKey("cameras.id"), nullable=False, index=True)
    last_heartbeat = Column(DateTime, nullable=False)
    latency_ms = Column(Integer, nullable=False, default=0)
    frame_drop_rate = Column(Float, nullable=False, default=0.0)
    uptime_percentage = Column(Float, nullable=False, default=100.0)
    recorded_at = Column(DateTime, nullable=False, server_default=func.now())

    # Relationships
    camera = relationship("CameraModel", back_populates="health_records")
