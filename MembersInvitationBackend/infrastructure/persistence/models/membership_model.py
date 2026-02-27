"""SQLAlchemy Membership model."""

from uuid import uuid4

from sqlalchemy import Column, DateTime, Enum, String, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import relationship

from infrastructure.persistence.database import Base


class MembershipModel(Base):
    __tablename__ = "memberships"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, index=True, default=uuid4)

    owner_user_id = Column(PG_UUID(as_uuid=True), nullable=False, index=True)
    member_user_id = Column(PG_UUID(as_uuid=True), nullable=False, index=True)
    member_email = Column(String(320), nullable=False, index=True)

    permission = Column(
        Enum('reader', 'editor', name="permission_level", create_type=False),
        nullable=False,
    )

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    revoked_at = Column(DateTime(timezone=True), nullable=True)

    cameras = relationship(
        "MembershipCameraModel",
        back_populates="membership",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
