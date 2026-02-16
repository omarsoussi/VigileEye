"""Invitation domain entity."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Optional, List
from uuid import UUID, uuid4


class PermissionLevel(str, Enum):
    READER = "reader"
    EDITOR = "editor"


class InvitationStatus(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    DECLINED = "declined"
    CANCELED = "canceled"
    EXPIRED = "expired"


@dataclass
class Invitation:
    inviter_user_id: UUID
    inviter_email: str
    recipient_email: str
    permission: PermissionLevel
    camera_ids: List[str]

    id: UUID = field(default_factory=uuid4)
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    expires_at: Optional[datetime] = None
    unlimited: bool = False

    status: InvitationStatus = InvitationStatus.PENDING

    code_hash: str = ""
    code_expires_at: Optional[datetime] = None

    handled_at: Optional[datetime] = None

    def is_expired(self, now: Optional[datetime] = None) -> bool:
        now = now or datetime.now(timezone.utc)
        if self.status in (InvitationStatus.ACCEPTED, InvitationStatus.DECLINED, InvitationStatus.CANCELED):
            return False
        if not self.unlimited and self.expires_at and now > self.expires_at:
            return True
        return False

    def can_accept(self, now: Optional[datetime] = None) -> bool:
        now = now or datetime.now(timezone.utc)
        if self.status != InvitationStatus.PENDING:
            return False
        if self.is_expired(now):
            return False
        return True
