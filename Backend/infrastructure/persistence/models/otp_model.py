"""
SQLAlchemy OTP Model for database persistence.
Maps the OTP domain entity to the database table.
"""
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Enum, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import relationship
from infrastructure.persistence.database import Base
from domain.entities.otp import OTPPurpose
import uuid


class OTPModel(Base):
    """
    SQLAlchemy model for otps table.
    """
    __tablename__ = "otps"
    
    id = Column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True
    )
    user_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    code = Column(
        String(6),
        nullable=False
    )
    purpose = Column(
        Enum(OTPPurpose),
        nullable=False
    )
    expires_at = Column(
        DateTime(timezone=True),
        nullable=False
    )
    is_used = Column(
        Boolean,
        default=False,
        nullable=False
    )
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )
    
    # Relationship
    user = relationship("UserModel", backref="otps")
    
    def __repr__(self):
        return f"<OTPModel(id={self.id}, user_id={self.user_id}, purpose={self.purpose})>"
