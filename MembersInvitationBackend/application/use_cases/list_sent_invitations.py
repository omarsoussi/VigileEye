"""Use case: list invitations sent by current user."""

from __future__ import annotations

from domain.repositories.invitation_repository import InvitationRepositoryInterface


class ListSentInvitationsUseCase:
    def __init__(self, invitation_repo: InvitationRepositoryInterface):
        self.invitation_repo = invitation_repo

    def execute(self, inviter_user_id):
        return self.invitation_repo.list_sent(inviter_user_id)
