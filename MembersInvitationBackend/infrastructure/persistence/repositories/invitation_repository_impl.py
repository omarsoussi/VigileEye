"""Concrete SQLAlchemy implementation of InvitationRepositoryInterface."""

from __future__ import annotations

from typing import List, Optional
from uuid import UUID

from sqlalchemy.orm import Session

from domain.entities.invitation import Invitation, InvitationStatus, PermissionLevel
from domain.repositories.invitation_repository import InvitationRepositoryInterface
from infrastructure.persistence.models.invitation_model import InvitationModel
from infrastructure.persistence.models.invitation_camera_model import InvitationCameraModel


class SQLAlchemyInvitationRepository(InvitationRepositoryInterface):
    def __init__(self, db: Session):
        self.db = db

    def add(self, invitation: Invitation) -> Invitation:
        model = InvitationModel(
            id=invitation.id,
            inviter_user_id=invitation.inviter_user_id,
            inviter_email=invitation.inviter_email,
            recipient_email=invitation.recipient_email,
            permission=invitation.permission,
            status=invitation.status,
            unlimited=invitation.unlimited,
            expires_at=invitation.expires_at,
            code_hash=invitation.code_hash,
            code_expires_at=invitation.code_expires_at,
            created_at=invitation.created_at,
            handled_at=invitation.handled_at,
        )
        model.cameras = [
            InvitationCameraModel(invitation_id=invitation.id, camera_id=camera_id)
            for camera_id in invitation.camera_ids
        ]

        self.db.add(model)
        self.db.commit()
        self.db.refresh(model)
        return self._to_entity(model)

    def get_by_id(self, invitation_id: UUID) -> Optional[Invitation]:
        model = (
            self.db.query(InvitationModel)
            .filter(InvitationModel.id == invitation_id)
            .first()
        )
        return self._to_entity(model) if model else None

    def list_sent(self, inviter_user_id: UUID) -> List[Invitation]:
        models = (
            self.db.query(InvitationModel)
            .filter(InvitationModel.inviter_user_id == inviter_user_id)
            .order_by(InvitationModel.created_at.desc())
            .all()
        )
        return [self._to_entity(m) for m in models]

    def list_received(self, recipient_email: str) -> List[Invitation]:
        models = (
            self.db.query(InvitationModel)
            .filter(InvitationModel.recipient_email == recipient_email)
            .order_by(InvitationModel.created_at.desc())
            .all()
        )
        return [self._to_entity(m) for m in models]

    def update(self, invitation: Invitation) -> Invitation:
        model = self.db.query(InvitationModel).filter(InvitationModel.id == invitation.id).first()
        if not model:
            # Treat as upsert-like error; caller should ensure existence
            return invitation

        model.status = InvitationStatus(invitation.status)
        model.unlimited = invitation.unlimited
        model.expires_at = invitation.expires_at
        model.code_hash = invitation.code_hash
        model.code_expires_at = invitation.code_expires_at
        model.handled_at = invitation.handled_at

        # Replace cameras if needed
        existing = {c.camera_id for c in model.cameras}
        incoming = set(invitation.camera_ids)
        if existing != incoming:
            model.cameras = [
                InvitationCameraModel(invitation_id=invitation.id, camera_id=camera_id)
                for camera_id in invitation.camera_ids
            ]

        self.db.add(model)
        self.db.commit()
        self.db.refresh(model)
        return self._to_entity(model)

    def _to_entity(self, model: InvitationModel) -> Invitation:
        return Invitation(
            id=model.id,
            inviter_user_id=model.inviter_user_id,
            inviter_email=model.inviter_email,
            recipient_email=model.recipient_email,
            permission=PermissionLevel(model.permission),
            camera_ids=[c.camera_id for c in (model.cameras or [])],
            created_at=model.created_at,
            expires_at=model.expires_at,
            unlimited=bool(model.unlimited),
            status=InvitationStatus(model.status),
            code_hash=model.code_hash,
            code_expires_at=model.code_expires_at,
            handled_at=model.handled_at,
        )
