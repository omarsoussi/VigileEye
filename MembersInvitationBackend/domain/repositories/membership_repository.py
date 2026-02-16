"""Abstract repository interface for Membership entity."""

from abc import ABC, abstractmethod
from typing import Optional
from uuid import UUID

from domain.entities.membership import Membership


class MembershipRepositoryInterface(ABC):
    @abstractmethod
    def add(self, membership: Membership) -> Membership:
        raise NotImplementedError

    @abstractmethod
    def get_by_owner_and_member(self, owner_user_id: UUID, member_user_id: UUID) -> Optional[Membership]:
        raise NotImplementedError
