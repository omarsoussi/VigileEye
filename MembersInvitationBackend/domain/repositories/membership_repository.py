"""Abstract repository interface for Membership entity."""

from abc import ABC, abstractmethod
from typing import List, Optional
from uuid import UUID

from domain.entities.membership import Membership


class MembershipRepositoryInterface(ABC):
    @abstractmethod
    def add(self, membership: Membership) -> Membership:
        raise NotImplementedError

    @abstractmethod
    def get_by_owner_and_member(self, owner_user_id: UUID, member_user_id: UUID) -> Optional[Membership]:
        raise NotImplementedError

    @abstractmethod
    def list_by_member_user_id(self, member_user_id: UUID) -> List[Membership]:
        """List all active memberships for a given member user."""
        raise NotImplementedError
