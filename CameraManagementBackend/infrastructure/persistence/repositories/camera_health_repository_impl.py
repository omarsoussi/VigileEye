"""SQLAlchemy camera health repository implementation."""
from typing import Optional
from uuid import UUID
from sqlalchemy.orm import Session
from domain.entities.camera_health import CameraHealth
from domain.repositories.camera_health_repository import CameraHealthRepositoryInterface
from infrastructure.persistence.models.camera_health_model import CameraHealthModel


class SQLAlchemyCameraHealthRepository(CameraHealthRepositoryInterface):
    """Concrete SQLAlchemy implementation of camera health repository."""

    def __init__(self, db: Session):
        self.db = db

    def record_health(self, health: CameraHealth) -> CameraHealth:
        """Record a health check for a camera."""
        model = CameraHealthModel(
            id=health.id,
            camera_id=health.camera_id,
            last_heartbeat=health.last_heartbeat,
            latency_ms=health.latency_ms,
            frame_drop_rate=health.frame_drop_rate,
            uptime_percentage=health.uptime_percentage,
        )
        self.db.add(model)
        self.db.commit()
        return health

    def get_latest_health(self, camera_id: UUID) -> Optional[CameraHealth]:
        """Get latest health record for a camera."""
        model = self.db.query(CameraHealthModel).filter(
            CameraHealthModel.camera_id == camera_id
        ).order_by(CameraHealthModel.recorded_at.desc()).first()
        
        if not model:
            return None
        return self._model_to_entity(model)

    def get_health_history(self, camera_id: UUID, limit: int = 100) -> list[CameraHealth]:
        """Get health history for a camera."""
        models = self.db.query(CameraHealthModel).filter(
            CameraHealthModel.camera_id == camera_id
        ).order_by(CameraHealthModel.recorded_at.desc()).limit(limit).all()
        
        return [self._model_to_entity(m) for m in models]

    @staticmethod
    def _model_to_entity(model: CameraHealthModel) -> CameraHealth:
        """Convert model to entity."""
        return CameraHealth(
            id=model.id,
            camera_id=model.camera_id,
            last_heartbeat=model.last_heartbeat,
            latency_ms=model.latency_ms,
            frame_drop_rate=model.frame_drop_rate,
            uptime_percentage=model.uptime_percentage,
            recorded_at=model.recorded_at,
        )
