"""Concrete SQLAlchemy implementation of GroupMemberRepositoryInterface."""

from __future__ import annotations

from typing import List, Optional
from uuid import UUID

from sqlalchemy.orm import Session

from domain.entities.group_member import GroupMember, GroupMemberStatus
from domain.entities.invitation import PermissionLevel
from domain.repositories.group_member_repository import GroupMemberRepositoryInterface
from infrastructure.persistence.models.group_member_model import GroupMemberModel


class SQLAlchemyGroupMemberRepository(GroupMemberRepositoryInterface):
    def __init__(self, db: Session):
        self.db = db

    def add(self, group_member: GroupMember) -> GroupMember:
        model = GroupMemberModel(
            id=group_member.id,
            group_id=group_member.group_id,
            member_user_id=group_member.member_user_id,
            member_email=group_member.member_email,
            access=group_member.access.value if hasattr(group_member.access, 'value') else group_member.access,
            status=group_member.status.value if hasattr(group_member.status, 'value') else group_member.status,
            invite_code_hash=group_member.invite_code_hash,
            code_expires_at=group_member.code_expires_at,
            created_at=group_member.created_at,
            handled_at=group_member.handled_at,
        )
        self.db.add(model)
        self.db.commit()
        self.db.refresh(model)
        return self._to_entity(model)

    def get_by_id(self, member_id: UUID) -> Optional[GroupMember]:
        model = self.db.query(GroupMemberModel).filter(GroupMemberModel.id == member_id).first()
        return self._to_entity(model) if model else None

    def list_by_group(self, group_id: UUID) -> List[GroupMember]:
        models = (
            self.db.query(GroupMemberModel)
            .filter(GroupMemberModel.group_id == group_id)
            .order_by(GroupMemberModel.created_at.desc())
            .all()
        )
        return [self._to_entity(m) for m in models]

    def list_pending_by_group(self, group_id: UUID) -> List[GroupMember]:
        models = (
            self.db.query(GroupMemberModel)
            .filter(GroupMemberModel.group_id == group_id)
            .filter(GroupMemberModel.status == GroupMemberStatus.PENDING)
            .order_by(GroupMemberModel.created_at.desc())
            .all()
        )
        return [self._to_entity(m) for m in models]

    def get_by_group_and_email(self, group_id: UUID, email: str) -> Optional[GroupMember]:
        model = (
            self.db.query(GroupMemberModel)
            .filter(GroupMemberModel.group_id == group_id)
            .filter(GroupMemberModel.member_email == email.lower())
            .first()
        )
        return self._to_entity(model) if model else None

    def update(self, group_member: GroupMember) -> GroupMember:
        model = self.db.query(GroupMemberModel).filter(GroupMemberModel.id == group_member.id).first()
        if not model:
            return group_member
        model.member_user_id = group_member.member_user_id
        model.access = group_member.access.value if hasattr(group_member.access, 'value') else group_member.access
        model.status = group_member.status.value if hasattr(group_member.status, 'value') else group_member.status
        model.invite_code_hash = group_member.invite_code_hash
        model.code_expires_at = group_member.code_expires_at
        model.handled_at = group_member.handled_at
        self.db.add(model)
        self.db.commit()
        self.db.refresh(model)
        return self._to_entity(model)

    def list_by_email(self, member_email: str) -> List[GroupMember]:
        models = (
            self.db.query(GroupMemberModel)
            .filter(GroupMemberModel.member_email == member_email.lower())
            .order_by(GroupMemberModel.created_at.desc())
            .all()
        )
        return [self._to_entity(m) for m in models]

    def delete(self, member_id: UUID) -> None:
        model = self.db.query(GroupMemberModel).filter(GroupMemberModel.id == member_id).first()
        if model:
            self.db.delete(model)
            self.db.commit()

    def _to_entity(self, model: GroupMemberModel) -> GroupMember:
        return GroupMember(
            id=model.id,
            group_id=model.group_id,
            member_user_id=model.member_user_id,
            member_email=model.member_email,
            access=PermissionLevel(model.access.lower() if isinstance(model.access, str) else model.access.value),
            status=GroupMemberStatus(model.status),
            invite_code_hash=model.invite_code_hash,
            code_expires_at=model.code_expires_at,
            created_at=model.created_at,
            handled_at=model.handled_at,
        )
