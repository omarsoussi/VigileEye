"""SQLAlchemy CameraAccess model."""
from uuid import uuid4
from sqlalchemy import Column, ForeignKey, String, DateTime, Enum, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import relationship
from infrastructure.persistence.database import Base
from domain.entities.camera_access import CameraPermission


class CameraAccessModel(Base):
    """SQLAlchemy model for camera access control."""
    __tablename__ = "camera_access"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    camera_id = Column(PG_UUID(as_uuid=True), ForeignKey("cameras.id"), nullable=False, index=True)
    user_id = Column(PG_UUID(as_uuid=True), nullable=False, index=True)
    permission = Column(Enum(CameraPermission), nullable=False, default=CameraPermission.VIEW)
    granted_at = Column(DateTime, nullable=False, server_default=func.now())

    # Relationships
    camera = relationship("CameraModel", back_populates="access_records")
