"""Use case: accept a group member invitation with code."""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from domain.entities.group_member import GroupMemberStatus
from domain.entities.membership import Membership
from domain.exceptions import (
    GroupCodeExpiredException,
    GroupMemberAlreadyHandledException,
    GroupMemberNotFoundException,
    GroupNotFoundException,
    InvalidGroupCodeException,
    UnauthorizedException,
)
from domain.repositories.group_member_repository import GroupMemberRepositoryInterface
from domain.repositories.group_repository import GroupRepositoryInterface
from domain.repositories.membership_repository import MembershipRepositoryInterface
from infrastructure.security.password_hasher import PasswordHasher


class AcceptGroupMemberUseCase:
    def __init__(
        self,
        group_repo: GroupRepositoryInterface,
        member_repo: GroupMemberRepositoryInterface,
        membership_repo: MembershipRepositoryInterface,
    ):
        self.group_repo = group_repo
        self.member_repo = member_repo
        self.membership_repo = membership_repo

    def execute(
        self,
        group_id: UUID,
        member_id: UUID,
        current_user_id: UUID,
        current_user_email: str,
        code: str,
    ) -> Membership:
        group = self.group_repo.get_by_id(group_id)
        if not group:
            raise GroupNotFoundException("Group not found")

        member = self.member_repo.get_by_id(member_id)
        if not member or member.group_id != group_id:
            raise GroupMemberNotFoundException("Group member not found")

        if member.member_email.lower() != current_user_email.lower():
            raise UnauthorizedException("This invitation is not for your email")

        now = datetime.now(timezone.utc)

        if member.status != GroupMemberStatus.PENDING:
            raise GroupMemberAlreadyHandledException("Group invitation already handled")

        if member.code_expires_at and now > member.code_expires_at:
            raise GroupCodeExpiredException("Invitation code expired")

        if not PasswordHasher.verify(code, member.invite_code_hash):
            raise InvalidGroupCodeException("Invalid invitation code")

        # Check for existing membership (idempotent)
        existing = self.membership_repo.get_by_owner_and_member(
            group.owner_user_id, current_user_id
        )
        if existing:
            member.status = GroupMemberStatus.ACCEPTED
            member.member_user_id = current_user_id
            member.handled_at = now
            self.member_repo.update(member)
            return existing

        membership = Membership(
            owner_user_id=group.owner_user_id,
            member_user_id=current_user_id,
            member_email=current_user_email,
            permission=member.access,
            camera_ids=list(group.camera_ids) if group.camera_ids else [],
        )

        saved_membership = self.membership_repo.add(membership)

        member.status = GroupMemberStatus.ACCEPTED
        member.member_user_id = current_user_id
        member.handled_at = now
        self.member_repo.update(member)

        return saved_membership
