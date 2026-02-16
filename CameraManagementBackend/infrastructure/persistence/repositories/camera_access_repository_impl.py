"""SQLAlchemy camera access repository implementation."""
from typing import List, Optional
from uuid import UUID
from sqlalchemy.orm import Session
from domain.entities.camera_access import CameraAccess, CameraPermission
from domain.repositories.camera_access_repository import CameraAccessRepositoryInterface
from infrastructure.persistence.models.camera_access_model import CameraAccessModel


class SQLAlchemyCameraAccessRepository(CameraAccessRepositoryInterface):
    """Concrete SQLAlchemy implementation of camera access repository."""

    def __init__(self, db: Session):
        self.db = db

    def grant_access(self, access: CameraAccess) -> CameraAccess:
        """Grant access to a user for a camera."""
        model = CameraAccessModel(
            id=access.id,
            camera_id=access.camera_id,
            user_id=access.user_id,
            permission=access.permission,
        )
        self.db.add(model)
        self.db.commit()
        return access

    def revoke_access(self, camera_id: UUID, user_id: UUID) -> None:
        """Revoke user access to a camera."""
        self.db.query(CameraAccessModel).filter(
            CameraAccessModel.camera_id == camera_id,
            CameraAccessModel.user_id == user_id,
        ).delete()
        self.db.commit()

    def get_access(self, camera_id: UUID, user_id: UUID) -> Optional[CameraAccess]:
        """Get access record for user/camera pair."""
        model = self.db.query(CameraAccessModel).filter(
            CameraAccessModel.camera_id == camera_id,
            CameraAccessModel.user_id == user_id,
        ).first()
        if not model:
            return None
        return self._model_to_entity(model)

    def list_user_cameras(self, user_id: UUID) -> List[UUID]:
        """List all cameras accessible by a user."""
        models = self.db.query(CameraAccessModel).filter(
            CameraAccessModel.user_id == user_id
        ).all()
        return [m.camera_id for m in models]

    def list_camera_users(self, camera_id: UUID) -> List[CameraAccess]:
        """List all users with access to a camera."""
        models = self.db.query(CameraAccessModel).filter(
            CameraAccessModel.camera_id == camera_id
        ).all()
        return [self._model_to_entity(m) for m in models]

    @staticmethod
    def _model_to_entity(model: CameraAccessModel) -> CameraAccess:
        """Convert model to entity."""
        return CameraAccess(
            id=model.id,
            camera_id=model.camera_id,
            user_id=model.user_id,
            permission=model.permission,
            granted_at=model.granted_at,
        )
