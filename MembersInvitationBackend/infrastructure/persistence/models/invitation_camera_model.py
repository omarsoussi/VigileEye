"""SQLAlchemy InvitationCamera model."""

from uuid import uuid4

from sqlalchemy import Column, ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import relationship

from infrastructure.persistence.database import Base


class InvitationCameraModel(Base):
    __tablename__ = "invitation_cameras"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    invitation_id = Column(PG_UUID(as_uuid=True), ForeignKey("invitations.id", ondelete="CASCADE"), nullable=False, index=True)
    camera_id = Column(String(64), nullable=False)

    invitation = relationship("InvitationModel", back_populates="cameras")

    __table_args__ = (UniqueConstraint("invitation_id", "camera_id", name="uq_invitation_camera"),)
