"""Abstract repository interface for GroupMember entity."""

from abc import ABC, abstractmethod
from typing import List, Optional
from uuid import UUID

from domain.entities.group_member import GroupMember


class GroupMemberRepositoryInterface(ABC):
    @abstractmethod
    def add(self, group_member: GroupMember) -> GroupMember:
        raise NotImplementedError

    @abstractmethod
    def get_by_id(self, member_id: UUID) -> Optional[GroupMember]:
        raise NotImplementedError

    @abstractmethod
    def list_by_group(self, group_id: UUID) -> List[GroupMember]:
        raise NotImplementedError

    @abstractmethod
    def list_pending_by_group(self, group_id: UUID) -> List[GroupMember]:
        raise NotImplementedError

    @abstractmethod
    def get_by_group_and_email(self, group_id: UUID, email: str) -> Optional[GroupMember]:
        raise NotImplementedError

    @abstractmethod
    def update(self, group_member: GroupMember) -> GroupMember:
        raise NotImplementedError

    @abstractmethod
    def list_by_email(self, member_email: str) -> List[GroupMember]:
        raise NotImplementedError

    @abstractmethod
    def delete(self, member_id: UUID) -> None:
        raise NotImplementedError
