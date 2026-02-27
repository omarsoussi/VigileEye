"""SQLAlchemy Group model."""

from uuid import uuid4

from sqlalchemy import Column, DateTime, Enum, String, Text, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import relationship

from infrastructure.persistence.database import Base


class GroupModel(Base):
    __tablename__ = "groups"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, index=True, default=uuid4)

    owner_user_id = Column(PG_UUID(as_uuid=True), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    icon = Column(String(100), nullable=False, server_default="people")
    color = Column(String(30), nullable=False, server_default="#4f46e5")
    default_permission = Column(
        Enum('reader', 'editor', name="permission_level", create_type=False),
        nullable=False,
    )

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    members = relationship(
        "GroupMemberModel",
        back_populates="group",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    cameras = relationship(
        "GroupCameraModel",
        back_populates="group",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
