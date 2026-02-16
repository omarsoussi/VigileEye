"""SQLAlchemy Camera model."""
from uuid import uuid4
from sqlalchemy import Column, String, Integer, Float, DateTime, Boolean, Enum, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import relationship
from infrastructure.persistence.database import Base
from domain.entities.camera import CameraStatus, CameraType


class CameraModel(Base):
    """SQLAlchemy model for Camera entity."""
    __tablename__ = "cameras"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    owner_user_id = Column(PG_UUID(as_uuid=True), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(String(1024), nullable=True)
    stream_url = Column(String(1024), nullable=False)
    protocol = Column(String(50), nullable=False)  # RTSP, HTTP
    username = Column(String(255), nullable=True)
    password = Column(String(255), nullable=True)
    resolution = Column(String(50), nullable=False)
    fps = Column(Integer, nullable=False)
    encoding = Column(String(50), nullable=False)
    status = Column(Enum(CameraStatus), nullable=False, default=CameraStatus.OFFLINE)
    camera_type = Column(Enum(CameraType), nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    
    # Location
    building = Column(String(255), nullable=True)
    floor = Column(String(50), nullable=True)
    zone = Column(String(255), nullable=True)
    room = Column(String(255), nullable=True)
    gps_lat = Column(Float, nullable=True)
    gps_long = Column(Float, nullable=True)
    
    last_heartbeat = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())

    # Relationships
    access_records = relationship("CameraAccessModel", back_populates="camera", cascade="all, delete-orphan")
    health_records = relationship("CameraHealthModel", back_populates="camera", cascade="all, delete-orphan")
