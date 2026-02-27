"""Use case: update a group."""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from domain.entities.invitation import PermissionLevel
from domain.exceptions import GroupNotFoundException, UnauthorizedException
from domain.repositories.group_repository import GroupRepositoryInterface


class UpdateGroupUseCase:
    def __init__(self, group_repo: GroupRepositoryInterface):
        self.group_repo = group_repo

    def execute(
        self,
        group_id: UUID,
        owner_user_id: UUID,
        name: str | None = None,
        description: str | None = None,
        icon: str | None = None,
        color: str | None = None,
        default_permission: str | None = None,
        camera_ids: list[str] | None = None,
    ):
        group = self.group_repo.get_by_id(group_id)
        if not group:
            raise GroupNotFoundException("Group not found")
        if group.owner_user_id != owner_user_id:
            raise UnauthorizedException("Only the group owner can update the group")

        if name is not None:
            group.name = name
        if description is not None:
            group.description = description
        if icon is not None:
            group.icon = icon
        if color is not None:
            group.color = color
        if default_permission is not None:
            group.default_permission = PermissionLevel(default_permission)
        if camera_ids is not None:
            group.camera_ids = camera_ids

        group.updated_at = datetime.now(timezone.utc)
        return self.group_repo.update(group)
