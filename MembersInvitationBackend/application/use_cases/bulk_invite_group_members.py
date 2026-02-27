"""Use case: bulk invite members to a group."""

from __future__ import annotations

from typing import List, Tuple
from uuid import UUID

from domain.exceptions import GroupNotFoundException, UnauthorizedException
from domain.repositories.group_member_repository import GroupMemberRepositoryInterface
from domain.repositories.group_repository import GroupRepositoryInterface
from infrastructure.config.settings import Settings
from infrastructure.external.email_sender import EmailSenderInterface

from application.use_cases.invite_group_member import InviteGroupMemberUseCase


class BulkInviteGroupMembersUseCase:
    def __init__(
        self,
        group_repo: GroupRepositoryInterface,
        member_repo: GroupMemberRepositoryInterface,
        email_sender: EmailSenderInterface,
        settings: Settings,
    ):
        self.group_repo = group_repo
        self.member_repo = member_repo
        self.email_sender = email_sender
        self.settings = settings

    def execute(
        self,
        group_id: UUID,
        owner_user_id: UUID,
        owner_email: str,
        emails: List[str],
        access: str | None = None,
    ) -> Tuple[List[str], List[str]]:
        """Returns (invited, skipped) email lists."""
        group = self.group_repo.get_by_id(group_id)
        if not group:
            raise GroupNotFoundException("Group not found")
        if group.owner_user_id != owner_user_id:
            raise UnauthorizedException("Only the group owner can invite members")

        use_case = InviteGroupMemberUseCase(
            self.group_repo, self.member_repo, self.email_sender, self.settings
        )

        invited: List[str] = []
        skipped: List[str] = []

        for email in emails:
            try:
                use_case.execute(group_id, owner_user_id, owner_email, email, access)
                invited.append(email)
            except Exception:
                skipped.append(email)

        return invited, skipped
