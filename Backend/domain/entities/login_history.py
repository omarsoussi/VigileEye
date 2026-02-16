"""
LoginHistory Entity - Core domain entity for tracking user login attempts.
Contains business logic for login history records.
"""
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4


@dataclass
class LoginHistory:
    """
    LoginHistory domain entity representing a login attempt record.
    
    Attributes:
        id: Unique identifier (UUID)
        user_id: ID of the user who attempted to login
        timestamp: When the login attempt occurred
        ip_address: IP address of the login attempt
        user_agent: Browser/device user agent string
        device_type: Type of device (desktop, mobile, tablet)
        browser: Browser name
        os: Operating system
        location: Approximate location based on IP
        success: Whether the login was successful
        is_suspicious: Flag for suspicious activity
        failure_reason: Reason for failure if unsuccessful
    """
    user_id: UUID
    ip_address: str
    id: UUID = field(default_factory=uuid4)
    timestamp: datetime = field(default_factory=datetime.utcnow)
    user_agent: Optional[str] = None
    device_type: str = "desktop"
    browser: Optional[str] = None
    os: Optional[str] = None
    location: Optional[str] = None
    success: bool = True
    is_suspicious: bool = False
    failure_reason: Optional[str] = None
    
    def mark_as_suspicious(self) -> None:
        """Mark this login attempt as suspicious."""
        self.is_suspicious = True
    
    def to_dict(self) -> dict:
        """Convert entity to dictionary."""
        return {
            "id": str(self.id),
            "user_id": str(self.user_id),
            "timestamp": self.timestamp.isoformat(),
            "ip_address": self.ip_address,
            "user_agent": self.user_agent,
            "device_type": self.device_type,
            "browser": self.browser,
            "os": self.os,
            "location": self.location,
            "success": self.success,
            "is_suspicious": self.is_suspicious,
            "failure_reason": self.failure_reason,
        }
