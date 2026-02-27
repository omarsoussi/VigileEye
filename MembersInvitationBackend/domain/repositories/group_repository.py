"""Abstract repository interface for Group entity."""

from abc import ABC, abstractmethod
from typing import List, Optional
from uuid import UUID

from domain.entities.group import Group


class GroupRepositoryInterface(ABC):
    @abstractmethod
    def add(self, group: Group) -> Group:
        raise NotImplementedError

    @abstractmethod
    def get_by_id(self, group_id: UUID) -> Optional[Group]:
        raise NotImplementedError

    @abstractmethod
    def list_by_owner(self, owner_user_id: UUID) -> List[Group]:
        raise NotImplementedError

    @abstractmethod
    def update(self, group: Group) -> Group:
        raise NotImplementedError

    @abstractmethod
    def delete(self, group_id: UUID) -> None:
        raise NotImplementedError
