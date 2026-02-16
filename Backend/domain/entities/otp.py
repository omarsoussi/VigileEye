"""
OTP (One-Time Password) Entity for email verification and 2FA.
"""
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import UUID, uuid4
from enum import Enum


class OTPPurpose(str, Enum):
    """Purpose of the OTP code."""
    EMAIL_VERIFICATION = "email_verification"
    LOGIN_2FA = "login_2fa"
    PASSWORD_RESET = "password_reset"


@dataclass
class OTP:
    """
    OTP domain entity for managing one-time passwords.
    
    Attributes:
        id: Unique identifier
        user_id: Associated user's ID
        code: 6-digit OTP code
        purpose: What the OTP is for
        expires_at: When the OTP expires
        is_used: Whether the OTP has been used
        created_at: When the OTP was created
    """
    user_id: UUID
    code: str
    purpose: OTPPurpose
    expires_at: datetime
    id: UUID = field(default_factory=uuid4)
    is_used: bool = False
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    
    def is_expired(self) -> bool:
        """Check if OTP has expired."""
        now = datetime.now(timezone.utc)
        # Handle both naive and aware datetimes
        if self.expires_at.tzinfo is None:
            return datetime.utcnow() > self.expires_at
        return now > self.expires_at
    
    def is_valid(self) -> bool:
        """Check if OTP is still valid (not expired and not used)."""
        return not self.is_expired() and not self.is_used
    
    def mark_as_used(self) -> None:
        """Mark OTP as used."""
        self.is_used = True
    
    @classmethod
    def create(
        cls,
        user_id: UUID,
        code: str,
        purpose: OTPPurpose,
        expire_minutes: int = 5
    ) -> "OTP":
        """Factory method to create a new OTP."""
        return cls(
            user_id=user_id,
            code=code,
            purpose=purpose,
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=expire_minutes)
        )
