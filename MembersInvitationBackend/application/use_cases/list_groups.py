"""Use case: list groups owned by the current user."""

from __future__ import annotations

from uuid import UUID

from domain.repositories.group_repository import GroupRepositoryInterface


class ListGroupsUseCase:
    def __init__(self, group_repo: GroupRepositoryInterface):
        self.group_repo = group_repo

    def execute(self, owner_user_id: UUID):
        return self.group_repo.list_by_owner(owner_user_id)
