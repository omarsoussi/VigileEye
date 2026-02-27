"""SQLAlchemy Invitation model."""

from uuid import uuid4

from sqlalchemy import Boolean, Column, DateTime, Enum, String, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import relationship

from infrastructure.persistence.database import Base


class InvitationModel(Base):
    __tablename__ = "invitations"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, index=True, default=uuid4)

    inviter_user_id = Column(PG_UUID(as_uuid=True), nullable=False, index=True)
    inviter_email = Column(String(320), nullable=False, index=True)

    recipient_email = Column(String(320), nullable=False, index=True)

    permission = Column(
        Enum('reader', 'editor', name="permission_level", create_type=False),
        nullable=False,
    )
    status = Column(
        Enum('pending', 'accepted', 'declined', 'canceled', 'expired', name="invitation_status", create_type=False),
        nullable=False,
    )

    unlimited = Column(Boolean, nullable=False, default=False)
    expires_at = Column(DateTime(timezone=True), nullable=True)

    code_hash = Column(String(200), nullable=False)
    code_expires_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    handled_at = Column(DateTime(timezone=True), nullable=True)

    cameras = relationship(
        "InvitationCameraModel",
        back_populates="invitation",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
