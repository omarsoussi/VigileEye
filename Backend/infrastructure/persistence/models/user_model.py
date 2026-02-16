"""
SQLAlchemy User Model for database persistence.
Maps the User domain entity to the database table.
"""
from sqlalchemy import Column, String, Boolean, DateTime, Integer, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from infrastructure.persistence.database import Base
import uuid


class UserModel(Base):
    """
    SQLAlchemy model for users table.
    """
    __tablename__ = "users"
    
    id = Column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True
    )
    email = Column(
        String(255),
        unique=True,
        nullable=False,
        index=True
    )
    username = Column(
        String(100),
        unique=True,
        nullable=False,
        index=True
    )
    password_hash = Column(
        String(255),
        nullable=False
    )
    is_verified = Column(
        Boolean,
        default=False,
        nullable=False
    )
    last_login = Column(
        DateTime(timezone=True),
        nullable=True
    )
    failed_login_attempts = Column(
        Integer,
        default=0,
        nullable=False
    )
    lockout_until = Column(
        DateTime(timezone=True),
        nullable=True
    )
    google_id = Column(
        String(255),
        unique=True,
        nullable=True,
        index=True
    )
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )
    
    def __repr__(self):
        return f"<UserModel(id={self.id}, email={self.email}, username={self.username})>"
