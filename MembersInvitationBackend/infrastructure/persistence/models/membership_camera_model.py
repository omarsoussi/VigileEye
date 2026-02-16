"""SQLAlchemy MembershipCamera model."""

from uuid import uuid4

from sqlalchemy import Column, ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import relationship

from infrastructure.persistence.database import Base


class MembershipCameraModel(Base):
    __tablename__ = "membership_cameras"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    membership_id = Column(PG_UUID(as_uuid=True), ForeignKey("memberships.id", ondelete="CASCADE"), nullable=False, index=True)
    camera_id = Column(String(64), nullable=False)

    membership = relationship("MembershipModel", back_populates="cameras")

    __table_args__ = (UniqueConstraint("membership_id", "camera_id", name="uq_membership_camera"),)
