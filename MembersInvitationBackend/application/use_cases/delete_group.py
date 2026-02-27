"""Use case: delete a group."""

from __future__ import annotations

from uuid import UUID

from domain.exceptions import GroupNotFoundException, UnauthorizedException
from domain.repositories.group_repository import GroupRepositoryInterface


class DeleteGroupUseCase:
    def __init__(self, group_repo: GroupRepositoryInterface):
        self.group_repo = group_repo

    def execute(self, group_id: UUID, owner_user_id: UUID) -> None:
        group = self.group_repo.get_by_id(group_id)
        if not group:
            raise GroupNotFoundException("Group not found")
        if group.owner_user_id != owner_user_id:
            raise UnauthorizedException("Only the group owner can delete the group")

        self.group_repo.delete(group_id)
