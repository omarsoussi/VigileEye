"""Use case: decline a group member invitation."""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from domain.entities.group_member import GroupMemberStatus
from domain.exceptions import (
    GroupMemberAlreadyHandledException,
    GroupMemberNotFoundException,
    UnauthorizedException,
)
from domain.repositories.group_member_repository import GroupMemberRepositoryInterface


class DeclineGroupMemberUseCase:
    def __init__(self, member_repo: GroupMemberRepositoryInterface):
        self.member_repo = member_repo

    def execute(self, member_id: UUID, current_user_email: str) -> None:
        member = self.member_repo.get_by_id(member_id)
        if not member:
            raise GroupMemberNotFoundException("Group member not found")

        if member.member_email.lower() != current_user_email.lower():
            raise UnauthorizedException("This invitation is not for your email")

        if member.status != GroupMemberStatus.PENDING:
            raise GroupMemberAlreadyHandledException("Group invitation already handled")

        member.status = GroupMemberStatus.DECLINED
        member.handled_at = datetime.now(timezone.utc)
        self.member_repo.update(member)
