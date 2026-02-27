"""SQLAlchemy GroupCamera model – junction table linking groups to cameras."""

from uuid import uuid4

from sqlalchemy import Column, ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import relationship

from infrastructure.persistence.database import Base


class GroupCameraModel(Base):
    __tablename__ = "group_cameras"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    group_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("groups.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    camera_id = Column(String(64), nullable=False)

    group = relationship("GroupModel", back_populates="cameras")

    __table_args__ = (
        UniqueConstraint("group_id", "camera_id", name="uq_group_camera"),
    )
