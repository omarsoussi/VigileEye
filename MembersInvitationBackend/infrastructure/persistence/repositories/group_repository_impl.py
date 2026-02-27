"""Concrete SQLAlchemy implementation of GroupRepositoryInterface."""

from __future__ import annotations

from typing import List, Optional
from uuid import UUID

from sqlalchemy.orm import Session

from domain.entities.group import Group
from domain.entities.invitation import PermissionLevel
from domain.repositories.group_repository import GroupRepositoryInterface
from infrastructure.persistence.models.group_camera_model import GroupCameraModel
from infrastructure.persistence.models.group_model import GroupModel


class SQLAlchemyGroupRepository(GroupRepositoryInterface):
    def __init__(self, db: Session):
        self.db = db

    def add(self, group: Group) -> Group:
        model = GroupModel(
            id=group.id,
            owner_user_id=group.owner_user_id,
            name=group.name,
            description=group.description,
            icon=group.icon,
            color=group.color,
            default_permission=group.default_permission.value if hasattr(group.default_permission, 'value') else group.default_permission,
            created_at=group.created_at,
            updated_at=group.updated_at,
        )
        self.db.add(model)
        self.db.flush()

        # Add camera associations
        for camera_id in (group.camera_ids or []):
            self.db.add(GroupCameraModel(group_id=model.id, camera_id=camera_id))

        self.db.commit()
        self.db.refresh(model)
        return self._to_entity(model)

    def get_by_id(self, group_id: UUID) -> Optional[Group]:
        model = self.db.query(GroupModel).filter(GroupModel.id == group_id).first()
        return self._to_entity(model) if model else None

    def list_by_owner(self, owner_user_id: UUID) -> List[Group]:
        models = (
            self.db.query(GroupModel)
            .filter(GroupModel.owner_user_id == owner_user_id)
            .order_by(GroupModel.created_at.desc())
            .all()
        )
        return [self._to_entity(m) for m in models]

    def update(self, group: Group) -> Group:
        model = self.db.query(GroupModel).filter(GroupModel.id == group.id).first()
        if not model:
            return group
        model.name = group.name
        model.description = group.description
        model.icon = group.icon
        model.color = group.color
        model.default_permission = group.default_permission.value if hasattr(group.default_permission, 'value') else group.default_permission
        model.updated_at = group.updated_at

        # Sync camera associations
        if group.camera_ids is not None:
            self.db.query(GroupCameraModel).filter(GroupCameraModel.group_id == model.id).delete()
            for camera_id in group.camera_ids:
                self.db.add(GroupCameraModel(group_id=model.id, camera_id=camera_id))

        self.db.add(model)
        self.db.commit()
        self.db.refresh(model)
        return self._to_entity(model)

    def delete(self, group_id: UUID) -> None:
        model = self.db.query(GroupModel).filter(GroupModel.id == group_id).first()
        if model:
            self.db.delete(model)
            self.db.commit()

    def _to_entity(self, model: GroupModel) -> Group:
        return Group(
            id=model.id,
            owner_user_id=model.owner_user_id,
            name=model.name,
            description=model.description,
            icon=model.icon,
            color=model.color,
            default_permission=PermissionLevel(model.default_permission),
            camera_ids=[c.camera_id for c in (model.cameras or [])],
            created_at=model.created_at,
            updated_at=model.updated_at,
        )
