"""Use case: resend invitation approval code."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from uuid import UUID

from domain.entities.invitation import InvitationStatus
from domain.exceptions import InvitationAlreadyHandledException, InvitationExpiredException, InvitationNotFoundException
from domain.repositories.invitation_repository import InvitationRepositoryInterface
from infrastructure.config.settings import Settings
from infrastructure.external.email_sender import EmailSenderInterface
from infrastructure.security.otp_generator import OTPGenerator
from infrastructure.security.password_hasher import PasswordHasher


class ResendInvitationCodeUseCase:
    def __init__(
        self,
        invitation_repo: InvitationRepositoryInterface,
        email_sender: EmailSenderInterface,
        settings: Settings,
    ):
        self.invitation_repo = invitation_repo
        self.email_sender = email_sender
        self.settings = settings

    def execute(self, invitation_id: UUID) -> None:
        invitation = self.invitation_repo.get_by_id(invitation_id)
        if not invitation:
            raise InvitationNotFoundException("Invitation not found")

        now = datetime.now(timezone.utc)

        if invitation.status != InvitationStatus.PENDING:
            raise InvitationAlreadyHandledException("Invitation already handled")

        if invitation.is_expired(now):
            raise InvitationExpiredException("Invitation expired")

        code = OTPGenerator.generate(6)
        invitation.code_hash = PasswordHasher.hash(code)
        invitation.code_expires_at = now + timedelta(minutes=self.settings.invitation_code_expire_minutes)
        self.invitation_repo.update(invitation)

        self.email_sender.send_invitation_code(
            to_email=invitation.recipient_email,
            code=code,
            inviter_email=invitation.inviter_email,
            permission=invitation.permission.value,
            expires_minutes=self.settings.invitation_code_expire_minutes,
        )
