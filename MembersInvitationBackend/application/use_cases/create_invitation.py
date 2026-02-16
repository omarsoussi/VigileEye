"""Use case: create an invitation and email an approval code."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from domain.entities.invitation import Invitation, PermissionLevel
from domain.exceptions import DomainException
from domain.repositories.invitation_repository import InvitationRepositoryInterface
from infrastructure.config.settings import Settings
from infrastructure.external.email_sender import EmailSenderInterface
from infrastructure.security.otp_generator import OTPGenerator
from infrastructure.security.password_hasher import PasswordHasher


class CreateInvitationUseCase:
    def __init__(
        self,
        invitation_repo: InvitationRepositoryInterface,
        email_sender: EmailSenderInterface,
        settings: Settings,
    ):
        self.invitation_repo = invitation_repo
        self.email_sender = email_sender
        self.settings = settings

    def execute(
        self,
        inviter_user_id,
        inviter_email: str,
        recipient_email: str,
        permission: str,
        camera_ids: list[str],
        unlimited: bool,
        expires_at,
    ) -> Invitation:
        now = datetime.now(timezone.utc)

        permission_level = PermissionLevel(permission)

        if unlimited:
            expires_at = None
        elif expires_at is not None:
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            if expires_at <= now:
                raise DomainException("Expiry date must be in the future")

        code = OTPGenerator.generate(6)
        code_hash = PasswordHasher.hash(code)
        code_expires_at = now + timedelta(minutes=self.settings.invitation_code_expire_minutes)

        invitation = Invitation(
            inviter_user_id=inviter_user_id,
            inviter_email=inviter_email,
            recipient_email=str(recipient_email).lower(),
            permission=permission_level,
            camera_ids=list(camera_ids),
            unlimited=bool(unlimited),
            expires_at=expires_at,
            code_hash=code_hash,
            code_expires_at=code_expires_at,
            created_at=now,
        )

        saved = self.invitation_repo.add(invitation)

        # Send email after DB commit so invitation exists.
        self.email_sender.send_invitation_code(
            to_email=saved.recipient_email,
            code=code,
            inviter_email=saved.inviter_email,
            permission=saved.permission.value,
            expires_minutes=self.settings.invitation_code_expire_minutes,
        )

        return saved
