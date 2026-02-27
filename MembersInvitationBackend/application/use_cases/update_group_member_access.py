"""Use case: update group member access."""

from __future__ import annotations

from uuid import UUID

from domain.entities.invitation import PermissionLevel
from domain.exceptions import (
    GroupMemberNotFoundException,
    GroupNotFoundException,
    UnauthorizedException,
)
from domain.repositories.group_member_repository import GroupMemberRepositoryInterface
from domain.repositories.group_repository import GroupRepositoryInterface


class UpdateGroupMemberAccessUseCase:
    def __init__(
        self,
        group_repo: GroupRepositoryInterface,
        member_repo: GroupMemberRepositoryInterface,
    ):
        self.group_repo = group_repo
        self.member_repo = member_repo

    def execute(
        self,
        group_id: UUID,
        member_id: UUID,
        owner_user_id: UUID,
        access: str | None = None,
    ):
        group = self.group_repo.get_by_id(group_id)
        if not group:
            raise GroupNotFoundException("Group not found")
        if group.owner_user_id != owner_user_id:
            raise UnauthorizedException("Only the group owner can update member access")

        member = self.member_repo.get_by_id(member_id)
        if not member or member.group_id != group_id:
            raise GroupMemberNotFoundException("Group member not found")

        if access is not None:
            member.access = PermissionLevel(access)

        return self.member_repo.update(member)
