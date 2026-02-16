"""Abstract repository interface for Invitation entity."""

from abc import ABC, abstractmethod
from typing import List, Optional
from uuid import UUID

from domain.entities.invitation import Invitation


class InvitationRepositoryInterface(ABC):
    @abstractmethod
    def add(self, invitation: Invitation) -> Invitation:
        raise NotImplementedError

    @abstractmethod
    def get_by_id(self, invitation_id: UUID) -> Optional[Invitation]:
        raise NotImplementedError

    @abstractmethod
    def list_sent(self, inviter_user_id: UUID) -> List[Invitation]:
        raise NotImplementedError

    @abstractmethod
    def list_received(self, recipient_email: str) -> List[Invitation]:
        raise NotImplementedError

    @abstractmethod
    def update(self, invitation: Invitation) -> Invitation:
        raise NotImplementedError
