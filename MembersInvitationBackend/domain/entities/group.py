"""Group domain entity."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID, uuid4

from domain.entities.invitation import PermissionLevel


@dataclass
class Group:
    owner_user_id: UUID
    name: str
    default_permission: PermissionLevel

    id: UUID = field(default_factory=uuid4)
    description: Optional[str] = None
    icon: str = "people"
    color: str = "#4f46e5"
    camera_ids: List[str] = field(default_factory=list)

    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
