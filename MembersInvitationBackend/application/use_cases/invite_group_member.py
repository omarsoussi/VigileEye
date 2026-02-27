"""Use case: invite a member to a group."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from uuid import UUID

from domain.entities.group_member import GroupMember
from domain.entities.invitation import PermissionLevel
from domain.exceptions import (
    GroupMemberAlreadyExistsException,
    GroupNotFoundException,
    UnauthorizedException,
)
from domain.repositories.group_member_repository import GroupMemberRepositoryInterface
from domain.repositories.group_repository import GroupRepositoryInterface
from infrastructure.config.settings import Settings
from infrastructure.external.email_sender import EmailSenderInterface
from infrastructure.security.otp_generator import OTPGenerator
from infrastructure.security.password_hasher import PasswordHasher


class InviteGroupMemberUseCase:
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
        member_email: str,
        access: str | None = None,
    ) -> GroupMember:
        group = self.group_repo.get_by_id(group_id)
        if not group:
            raise GroupNotFoundException("Group not found")
        if group.owner_user_id != owner_user_id:
            raise UnauthorizedException("Only the group owner can invite members")

        email_lower = member_email.lower()

        existing = self.member_repo.get_by_group_and_email(group_id, email_lower)
        if existing:
            raise GroupMemberAlreadyExistsException(
                f"{email_lower} is already a member of this group"
            )

        permission = PermissionLevel(access) if access else group.default_permission
        now = datetime.now(timezone.utc)

        code = OTPGenerator.generate(6)
        code_hash = PasswordHasher.hash(code)
        code_expires_at = now + timedelta(minutes=self.settings.invitation_code_expire_minutes)

        member = GroupMember(
            group_id=group_id,
            member_email=email_lower,
            access=permission,
            invite_code_hash=code_hash,
            code_expires_at=code_expires_at,
            created_at=now,
        )

        saved = self.member_repo.add(member)

        self.email_sender.send_invitation_code(
            to_email=email_lower,
            code=code,
            inviter_email=owner_email,
            permission=permission.value,
            expires_minutes=self.settings.invitation_code_expire_minutes,
        )

        return saved
