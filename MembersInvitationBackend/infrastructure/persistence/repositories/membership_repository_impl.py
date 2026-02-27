"""Concrete SQLAlchemy implementation of MembershipRepositoryInterface."""

from __future__ import annotations

from typing import Optional
from uuid import UUID

from sqlalchemy.orm import Session

from domain.entities.membership import Membership
from domain.entities.invitation import PermissionLevel
from domain.repositories.membership_repository import MembershipRepositoryInterface
from infrastructure.persistence.models.membership_model import MembershipModel
from infrastructure.persistence.models.membership_camera_model import MembershipCameraModel


class SQLAlchemyMembershipRepository(MembershipRepositoryInterface):
    def __init__(self, db: Session):
        self.db = db

    def add(self, membership: Membership) -> Membership:
        model = MembershipModel(
            id=membership.id,
            owner_user_id=membership.owner_user_id,
            member_user_id=membership.member_user_id,
            member_email=membership.member_email,
            permission=membership.permission.value if hasattr(membership.permission, 'value') else membership.permission,
            created_at=membership.created_at,
            revoked_at=membership.revoked_at,
        )
        model.cameras = [
            MembershipCameraModel(membership_id=membership.id, camera_id=camera_id)
            for camera_id in membership.camera_ids
        ]

        self.db.add(model)
        self.db.commit()
        self.db.refresh(model)
        return self._to_entity(model)

    def get_by_owner_and_member(self, owner_user_id: UUID, member_user_id: UUID) -> Optional[Membership]:
        model = (
            self.db.query(MembershipModel)
            .filter(MembershipModel.owner_user_id == owner_user_id)
            .filter(MembershipModel.member_user_id == member_user_id)
            .first()
        )
        return self._to_entity(model) if model else None

    def _to_entity(self, model: MembershipModel) -> Membership:
        return Membership(
            id=model.id,
            owner_user_id=model.owner_user_id,
            member_user_id=model.member_user_id,
            member_email=model.member_email,
            permission=PermissionLevel(model.permission) if isinstance(model.permission, str) else model.permission,
            camera_ids=[c.camera_id for c in (model.cameras or [])],
            created_at=model.created_at,
            revoked_at=model.revoked_at,
        )
