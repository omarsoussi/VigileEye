"""
SQLAlchemy LoginHistory Model for database persistence.
Maps the LoginHistory domain entity to the database table.
"""
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Text, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import relationship
from infrastructure.persistence.database import Base
import uuid


class LoginHistoryModel(Base):
    """
    SQLAlchemy model for login_history table.
    """
    __tablename__ = "login_history"
    
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
    timestamp = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True
    )
    ip_address = Column(
        String(45),  # Supports IPv6
        nullable=False
    )
    user_agent = Column(
        Text,
        nullable=True
    )
    device_type = Column(
        String(20),
        default="desktop",
        nullable=False
    )
    browser = Column(
        String(100),
        nullable=True
    )
    os = Column(
        String(100),
        nullable=True
    )
    location = Column(
        String(255),
        nullable=True
    )
    success = Column(
        Boolean,
        default=True,
        nullable=False
    )
    is_suspicious = Column(
        Boolean,
        default=False,
        nullable=False
    )
    failure_reason = Column(
        String(255),
        nullable=True
    )
    
    def __repr__(self):
        return f"<LoginHistoryModel(id={self.id}, user_id={self.user_id}, success={self.success})>"
