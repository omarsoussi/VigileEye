"""SQLAlchemy zone repository implementation."""
import json
from typing import List, Optional
from uuid import UUID
from sqlalchemy.orm import Session
from domain.entities.zone import Zone, ZoneType, ZoneSeverity, ZonePoint
from domain.repositories.zone_repository import ZoneRepositoryInterface
from infrastructure.persistence.models.zone_model import ZoneModel


class SQLAlchemyZoneRepository(ZoneRepositoryInterface):
    """Concrete SQLAlchemy implementation of zone repository."""

    def __init__(self, db: Session):
        self.db = db

    def _model_to_entity(self, model: ZoneModel) -> Zone:
        """Convert SQLAlchemy model to domain entity."""
        raw_points = model.get_points()
        points = [ZonePoint(x=p["x"], y=p["y"]) for p in raw_points]
        return Zone(
            id=model.id,
            camera_id=model.camera_id,
            owner_user_id=model.owner_user_id,
            name=model.name,
            zone_type=ZoneType(model.zone_type),
            severity=ZoneSeverity(model.severity),
            points=points,
            color=model.color,
            is_active=model.is_active,
            description=model.description,
            sensitivity=model.sensitivity,
            min_trigger_duration=model.min_trigger_duration,
            alert_cooldown=model.alert_cooldown,
            schedule_enabled=model.schedule_enabled,
            schedule_start=model.schedule_start,
            schedule_end=model.schedule_end,
            schedule_days=model.schedule_days,
            created_at=model.created_at,
            updated_at=model.updated_at,
        )

    def _entity_to_model(self, entity: Zone) -> ZoneModel:
        """Convert domain entity to SQLAlchemy model."""
        model = ZoneModel(
            id=entity.id,
            camera_id=entity.camera_id,
            owner_user_id=entity.owner_user_id,
            name=entity.name,
            zone_type=entity.zone_type.value,
            severity=entity.severity.value,
            color=entity.color,
            is_active=entity.is_active,
            description=entity.description,
            sensitivity=entity.sensitivity,
            min_trigger_duration=entity.min_trigger_duration,
            alert_cooldown=entity.alert_cooldown,
            schedule_enabled=entity.schedule_enabled,
            schedule_start=entity.schedule_start,
            schedule_end=entity.schedule_end,
            schedule_days=entity.schedule_days,
        )
        model.set_points([{"x": p.x, "y": p.y} for p in entity.points])
        return model

    def create(self, zone: Zone) -> Zone:
        model = self._entity_to_model(zone)
        self.db.add(model)
        self.db.commit()
        self.db.refresh(model)
        return self._model_to_entity(model)

    def get_by_id(self, zone_id: UUID) -> Optional[Zone]:
        model = self.db.query(ZoneModel).filter(ZoneModel.id == zone_id).first()
        return self._model_to_entity(model) if model else None

    def get_by_camera(self, camera_id: UUID) -> List[Zone]:
        models = self.db.query(ZoneModel).filter(ZoneModel.camera_id == camera_id).order_by(ZoneModel.created_at).all()
        return [self._model_to_entity(m) for m in models]

    def get_by_owner(self, owner_user_id: UUID) -> List[Zone]:
        models = self.db.query(ZoneModel).filter(ZoneModel.owner_user_id == owner_user_id).order_by(ZoneModel.created_at).all()
        return [self._model_to_entity(m) for m in models]

    def update(self, zone: Zone) -> Zone:
        model = self.db.query(ZoneModel).filter(ZoneModel.id == zone.id).first()
        if not model:
            raise ValueError(f"Zone {zone.id} not found")
        model.name = zone.name
        model.zone_type = zone.zone_type.value
        model.severity = zone.severity.value
        model.color = zone.color
        model.is_active = zone.is_active
        model.description = zone.description
        model.sensitivity = zone.sensitivity
        model.min_trigger_duration = zone.min_trigger_duration
        model.alert_cooldown = zone.alert_cooldown
        model.schedule_enabled = zone.schedule_enabled
        model.schedule_start = zone.schedule_start
        model.schedule_end = zone.schedule_end
        model.schedule_days = zone.schedule_days
        model.set_points([{"x": p.x, "y": p.y} for p in zone.points])
        self.db.commit()
        self.db.refresh(model)
        return self._model_to_entity(model)

    def delete(self, zone_id: UUID) -> None:
        model = self.db.query(ZoneModel).filter(ZoneModel.id == zone_id).first()
        if model:
            self.db.delete(model)
            self.db.commit()

    def delete_by_camera(self, camera_id: UUID) -> int:
        count = self.db.query(ZoneModel).filter(ZoneModel.camera_id == camera_id).delete()
        self.db.commit()
        return count
