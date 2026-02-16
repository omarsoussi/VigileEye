"""Use case: accept an invitation with an emailed approval code."""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from domain.entities.invitation import InvitationStatus
from domain.entities.membership import Membership
from domain.exceptions import (
    InvitationAlreadyHandledException,
    InvitationExpiredException,
    InvitationNotFoundException,
    InvalidInvitationCodeException,
    UnauthorizedException,
)
from domain.repositories.invitation_repository import InvitationRepositoryInterface
from domain.repositories.membership_repository import MembershipRepositoryInterface
from infrastructure.security.password_hasher import PasswordHasher


class AcceptInvitationUseCase:
    def __init__(
        self,
        invitation_repo: InvitationRepositoryInterface,
        membership_repo: MembershipRepositoryInterface,
    ):
        self.invitation_repo = invitation_repo
        self.membership_repo = membership_repo

    def execute(self, invitation_id: UUID, current_user_id: UUID, current_user_email: str, code: str) -> Membership:
        invitation = self.invitation_repo.get_by_id(invitation_id)
        if not invitation:
            raise InvitationNotFoundException("Invitation not found")

        if invitation.recipient_email.lower() != current_user_email.lower():
            raise UnauthorizedException("This invitation is not for your email")

        now = datetime.now(timezone.utc)

        if invitation.status != InvitationStatus.PENDING:
            raise InvitationAlreadyHandledException("Invitation already handled")

        if invitation.is_expired(now):
            invitation.status = InvitationStatus.EXPIRED
            invitation.handled_at = now
            self.invitation_repo.update(invitation)
            raise InvitationExpiredException("Invitation expired")

        if invitation.code_expires_at and now > invitation.code_expires_at:
            raise InvalidInvitationCodeException("Code expired")

        if not PasswordHasher.verify(code, invitation.code_hash):
            raise InvalidInvitationCodeException("Invalid code")

        existing = self.membership_repo.get_by_owner_and_member(invitation.inviter_user_id, current_user_id)
        if existing:
            # idempotent accept: still mark invitation accepted
            invitation.status = InvitationStatus.ACCEPTED
            invitation.handled_at = now
            self.invitation_repo.update(invitation)
            return existing

        membership = Membership(
            owner_user_id=invitation.inviter_user_id,
            member_user_id=current_user_id,
            member_email=current_user_email,
            permission=invitation.permission,
            camera_ids=invitation.camera_ids,
        )

        saved_membership = self.membership_repo.add(membership)

        invitation.status = InvitationStatus.ACCEPTED
        invitation.handled_at = now
        self.invitation_repo.update(invitation)

        return saved_membership
