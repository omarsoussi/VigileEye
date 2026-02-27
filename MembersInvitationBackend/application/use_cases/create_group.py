"""Use case: create a group."""

from __future__ import annotations

from datetime import datetime, timezone

from domain.entities.group import Group
from domain.entities.invitation import PermissionLevel
from domain.repositories.group_repository import GroupRepositoryInterface


class CreateGroupUseCase:
    def __init__(self, group_repo: GroupRepositoryInterface):
        self.group_repo = group_repo

    def execute(
        self,
        owner_user_id,
        name: str,
        default_permission: str,
        description: str | None = None,
        icon: str = "people",
        color: str = "#4f46e5",
        camera_ids: list[str] | None = None,
    ) -> Group:
        now = datetime.now(timezone.utc)
        permission_level = PermissionLevel(default_permission)

        group = Group(
            owner_user_id=owner_user_id,
            name=name,
            description=description,
            icon=icon,
            color=color,
            default_permission=permission_level,
            camera_ids=camera_ids or [],
            created_at=now,
            updated_at=now,
        )

        return self.group_repo.add(group)
