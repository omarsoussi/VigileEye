"""
User Entity - Core domain entity for user management.
Contains business logic and validation rules for users.
"""
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4


@dataclass
class User:
    """
    User domain entity representing a system user in theapp.
    
    Attributes:
        id: Unique identifier (UUID)
        email: User's email address (unique)
        username: User's username (unique)
        password_hash: Bcrypt hashed password
        is_verified: Whether email is verified
        last_login: Last successful login timestamp
        failed_login_attempts: Count of consecutive failed logins
        lockout_until: Timestamp until which account is locked
        created_at: Account creation timestamp
        updated_at: Last update timestamp
        google_id: Google OAuth ID if linked
    """
    email: str
    username: str
    password_hash: str
    id: UUID = field(default_factory=uuid4)
    is_verified: bool = False
    last_login: Optional[datetime] = None
    failed_login_attempts: int = 0
    lockout_until: Optional[datetime] = None
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)
    google_id: Optional[str] = None
    
    def is_locked(self) -> bool:
        """Check if account is currently locked."""
        if self.lockout_until is None:
            return False
        return datetime.utcnow() < self.lockout_until
    
    def increment_failed_attempts(self) -> None:
        """Increment failed login attempts counter."""
        self.failed_login_attempts += 1
        self.updated_at = datetime.utcnow()
    
    def reset_failed_attempts(self) -> None:
        """Reset failed login attempts after successful login."""
        self.failed_login_attempts = 0
        self.lockout_until = None
        self.updated_at = datetime.utcnow()
    
    def lock_account(self, until: datetime) -> None:
        """Lock account until specified datetime."""
        self.lockout_until = until
        self.updated_at = datetime.utcnow()
    
    def unlock_account(self) -> None:
        """Unlock the account."""
        self.lockout_until = None
        self.failed_login_attempts = 0
        self.updated_at = datetime.utcnow()
    
    def verify_email(self) -> None:
        """Mark email as verified."""
        self.is_verified = True
        self.updated_at = datetime.utcnow()
    
    def update_last_login(self) -> None:
        """Update last login timestamp."""
        self.last_login = datetime.utcnow()
        self.updated_at = datetime.utcnow()
    
    def update_password(self, password_hash: str) -> None:
        """Update password hash."""
        self.password_hash = password_hash
        self.updated_at = datetime.utcnow()
    
    def link_google_account(self, google_id: str) -> None:
        """Link Google OAuth account."""
        self.google_id = google_id
        self.is_verified = True  # Google accounts are pre-verified
        self.updated_at = datetime.utcnow()
