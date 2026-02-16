"""Membership domain entity.

Represents a granted access from an owner (inviter) to a member (recipient) for a set of cameras.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID, uuid4

from domain.entities.invitation import PermissionLevel


@dataclass
class Membership:
    owner_user_id: UUID
    member_user_id: UUID
    member_email: str
    permission: PermissionLevel
    camera_ids: List[str]

    id: UUID = field(default_factory=uuid4)
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    revoked_at: Optional[datetime] = None 

    def is_active(self) -> bool:
        return self.revoked_at is None
