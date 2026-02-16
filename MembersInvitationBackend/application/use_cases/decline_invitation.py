"""Use case: decline an invitation."""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from domain.entities.invitation import InvitationStatus
from domain.exceptions import InvitationAlreadyHandledException, InvitationNotFoundException, UnauthorizedException
from domain.repositories.invitation_repository import InvitationRepositoryInterface


class DeclineInvitationUseCase:
    def __init__(self, invitation_repo: InvitationRepositoryInterface):
        self.invitation_repo = invitation_repo

    def execute(self, invitation_id: UUID, current_user_email: str) -> None:
        invitation = self.invitation_repo.get_by_id(invitation_id)
        if not invitation:
            raise InvitationNotFoundException("Invitation not found")

        if invitation.recipient_email.lower() != current_user_email.lower():
            raise UnauthorizedException("This invitation is not for your email")

        if invitation.status != InvitationStatus.PENDING:
            raise InvitationAlreadyHandledException("Invitation already handled")

        invitation.status = InvitationStatus.DECLINED
        invitation.handled_at = datetime.now(timezone.utc)
        self.invitation_repo.update(invitation)
