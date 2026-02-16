"""Use case: list invitations received for current user's email."""

from __future__ import annotations

from domain.repositories.invitation_repository import InvitationRepositoryInterface


class ListReceivedInvitationsUseCase:
    def __init__(self, invitation_repo: InvitationRepositoryInterface):
        self.invitation_repo = invitation_repo

    def execute(self, recipient_email: str):
        return self.invitation_repo.list_received(recipient_email)
