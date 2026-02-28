"""SQLAlchemy Camera repository implementation."""
from typing import List, Optional
from uuid import UUID
from sqlalchemy.orm import Session
from domain.entities.camera import Camera, CameraStatus, CameraType, CameraLocation
from domain.repositories.camera_repository import CameraRepositoryInterface
from infrastructure.persistence.models.camera_model import CameraModel


class SQLAlchemyCameraRepository(CameraRepositoryInterface):
    """Concrete SQLAlchemy implementation of Camera repository."""

    def __init__(self, db: Session):
        self.db = db

    def create(self, camera: Camera) -> Camera:
        """Create a new camera."""
        model = CameraModel(
            id=camera.id,
            owner_user_id=camera.owner_user_id,
            name=camera.name,
            description=camera.description,
            stream_url=camera.stream_url,
            protocol=camera.protocol,
            username=camera.username,
            password=camera.password,
            resolution=camera.resolution,
            fps=camera.fps,
            encoding=camera.encoding,
            status=camera.status,
            camera_type=camera.camera_type,
            is_active=camera.is_active,
            building=camera.location.building if camera.location else None,
            floor=camera.location.floor if camera.location else None,
            zone=camera.location.zone if camera.location else None,
            room=camera.location.room if camera.location else None,
            gps_lat=camera.location.gps_lat if camera.location else None,
            gps_long=camera.location.gps_long if camera.location else None,
            last_heartbeat=camera.last_heartbeat,
        )
        self.db.add(model)
        self.db.commit()
        return camera

    def get_by_id(self, camera_id: UUID) -> Optional[Camera]:
        """Get camera by ID."""
        model = self.db.query(CameraModel).filter(CameraModel.id == camera_id).first()
        if not model:
            return None
        return self._model_to_entity(model)

    def get_by_owner(self, owner_user_id: UUID) -> List[Camera]:
        """Get all cameras owned by a user."""
        models = self.db.query(CameraModel).filter(
            CameraModel.owner_user_id == owner_user_id
        ).all()
        return [self._model_to_entity(m) for m in models]

    def get_by_ids(self, camera_ids: List[UUID]) -> List[Camera]:
        """Get cameras by a list of IDs."""
        if not camera_ids:
            return []
        models = self.db.query(CameraModel).filter(
            CameraModel.id.in_(camera_ids)
        ).all()
        return [self._model_to_entity(m) for m in models]

    def update(self, camera: Camera) -> Camera:
        """Update an existing camera."""
        model = self.db.query(CameraModel).filter(CameraModel.id == camera.id).first()
        if not model:
            raise ValueError(f"Camera {camera.id} not found")
        
        model.name = camera.name
        model.description = camera.description
        model.stream_url = camera.stream_url
        model.resolution = camera.resolution
        model.fps = camera.fps
        model.encoding = camera.encoding
        model.status = camera.status
        model.is_active = camera.is_active
        if camera.location:
            model.building = camera.location.building
            model.floor = camera.location.floor
            model.zone = camera.location.zone
            model.room = camera.location.room
            model.gps_lat = camera.location.gps_lat
            model.gps_long = camera.location.gps_long
        
        self.db.commit()
        return camera

    def delete(self, camera_id: UUID) -> None:
        """Delete a camera."""
        model = self.db.query(CameraModel).filter(CameraModel.id == camera_id).first()
        if model:
            self.db.delete(model)
            self.db.commit()

    def list_all(self) -> List[Camera]:
        """List all cameras."""
        models = self.db.query(CameraModel).all()
        return [self._model_to_entity(m) for m in models]

    @staticmethod
    def _model_to_entity(model: CameraModel) -> Camera:
        """Convert model to entity."""
        location = CameraLocation(
            building=model.building,
            floor=model.floor,
            zone=model.zone,
            room=model.room,
            gps_lat=model.gps_lat,
            gps_long=model.gps_long,
        ) if any([model.building, model.floor, model.zone, model.room, model.gps_lat, model.gps_long]) else None
        
        return Camera(
            id=model.id,
            owner_user_id=model.owner_user_id,
            name=model.name,
            description=model.description,
            stream_url=model.stream_url,
            protocol=model.protocol,
            username=model.username,
            password=model.password,
            resolution=model.resolution,
            fps=model.fps,
            encoding=model.encoding,
            status=model.status,
            camera_type=model.camera_type,
            is_active=model.is_active,
            location=location,
            last_heartbeat=model.last_heartbeat,
            created_at=model.created_at,
            updated_at=model.updated_at,
        )
