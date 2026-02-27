"""Use case: resend group member invitation code(s)."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from uuid import UUID

from domain.entities.group_member import GroupMemberStatus
from domain.exceptions import (
    GroupMemberAlreadyHandledException,
    GroupMemberNotFoundException,
    GroupNotFoundException,
    UnauthorizedException,
)
from domain.repositories.group_member_repository import GroupMemberRepositoryInterface
from domain.repositories.group_repository import GroupRepositoryInterface
from infrastructure.config.settings import Settings
from infrastructure.external.email_sender import EmailSenderInterface
from infrastructure.security.otp_generator import OTPGenerator
from infrastructure.security.password_hasher import PasswordHasher


class ResendGroupMemberCodeUseCase:
    """Resend code for a single group member."""

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

    def execute(self, group_id: UUID, member_id: UUID, owner_user_id: UUID, owner_email: str) -> None:
        group = self.group_repo.get_by_id(group_id)
        if not group:
            raise GroupNotFoundException("Group not found")
        if group.owner_user_id != owner_user_id:
            raise UnauthorizedException("Only the group owner can resend codes")

        member = self.member_repo.get_by_id(member_id)
        if not member or member.group_id != group_id:
            raise GroupMemberNotFoundException("Group member not found")

        if member.status != GroupMemberStatus.PENDING:
            raise GroupMemberAlreadyHandledException("Invitation already handled")

        now = datetime.now(timezone.utc)
        code = OTPGenerator.generate(6)
        member.invite_code_hash = PasswordHasher.hash(code)
        member.code_expires_at = now + timedelta(minutes=self.settings.invitation_code_expire_minutes)
        self.member_repo.update(member)

        self.email_sender.send_invitation_code(
            to_email=member.member_email,
            code=code,
            inviter_email=owner_email,
            permission=member.access.value,
            expires_minutes=self.settings.invitation_code_expire_minutes,
        )


class ResendAllGroupCodesUseCase:
    """Resend codes for all pending members in a group."""

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

    def execute(self, group_id: UUID, owner_user_id: UUID, owner_email: str) -> int:
        """Returns count of codes resent."""
        group = self.group_repo.get_by_id(group_id)
        if not group:
            raise GroupNotFoundException("Group not found")
        if group.owner_user_id != owner_user_id:
            raise UnauthorizedException("Only the group owner can resend codes")

        pending = self.member_repo.list_pending_by_group(group_id)
        now = datetime.now(timezone.utc)
        count = 0

        for member in pending:
            code = OTPGenerator.generate(6)
            member.invite_code_hash = PasswordHasher.hash(code)
            member.code_expires_at = now + timedelta(minutes=self.settings.invitation_code_expire_minutes)
            self.member_repo.update(member)

            self.email_sender.send_invitation_code(
                to_email=member.member_email,
                code=code,
                inviter_email=owner_email,
                permission=member.access.value,
                expires_minutes=self.settings.invitation_code_expire_minutes,
            )
            count += 1

        return count
