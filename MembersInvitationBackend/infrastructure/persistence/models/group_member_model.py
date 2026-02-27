"""SQLAlchemy GroupMember model."""

from uuid import uuid4

from sqlalchemy import Column, DateTime, Enum, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import relationship

from infrastructure.persistence.database import Base


class GroupMemberModel(Base):
    __tablename__ = "group_members"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, index=True, default=uuid4)

    group_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("groups.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    member_user_id = Column(PG_UUID(as_uuid=True), nullable=True, index=True)
    member_email = Column(String(320), nullable=False, index=True)

    access = Column(
        Enum('reader', 'editor', name="permission_level", create_type=False),
        nullable=False,
    )
    status = Column(
        Enum('pending', 'accepted', 'declined', name="group_member_status", create_type=False),
        nullable=False,
    )

    invite_code_hash = Column(String(200), nullable=False)
    code_expires_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    handled_at = Column(DateTime(timezone=True), nullable=True)

    group = relationship("GroupModel", back_populates="members")

    __table_args__ = (
        UniqueConstraint("group_id", "member_email", name="uq_group_member_email"),
    )
