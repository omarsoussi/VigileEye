"""GroupMember domain entity."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Optional
from uuid import UUID, uuid4

from domain.entities.invitation import PermissionLevel


class GroupMemberStatus(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    DECLINED = "declined"


@dataclass
class GroupMember:
    group_id: UUID
    member_email: str
    access: PermissionLevel

    id: UUID = field(default_factory=uuid4)
    member_user_id: Optional[UUID] = None

    invite_code_hash: str = ""
    code_expires_at: Optional[datetime] = None
    status: GroupMemberStatus = GroupMemberStatus.PENDING

    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    handled_at: Optional[datetime] = None
