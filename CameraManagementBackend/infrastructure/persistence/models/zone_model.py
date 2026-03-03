"""SQLAlchemy Zone model."""
import json
from uuid import uuid4
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Text, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from infrastructure.persistence.database import Base


class ZoneModel(Base):
    """SQLAlchemy model for detection zones."""
    __tablename__ = "zones"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    camera_id = Column(PG_UUID(as_uuid=True), ForeignKey("cameras.id", ondelete="CASCADE"), nullable=False, index=True)
    owner_user_id = Column(PG_UUID(as_uuid=True), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text(), nullable=True)
    zone_type = Column(String(50), nullable=False, server_default="intrusion")
    severity = Column(String(20), nullable=False, server_default="medium")
    # Points stored as JSON text: [{"x": 0.1, "y": 0.2}, ...]
    points_json = Column(Text(), nullable=False)
    color = Column(String(20), nullable=False, server_default="#ef4444")
    is_active = Column(Boolean(), nullable=False, server_default="true")
    sensitivity = Column(Integer(), nullable=False, server_default="50")
    min_trigger_duration = Column(Integer(), nullable=False, server_default="3")
    alert_cooldown = Column(Integer(), nullable=False, server_default="30")
    schedule_enabled = Column(Boolean(), nullable=False, server_default="false")
    schedule_start = Column(String(10), nullable=True)
    schedule_end = Column(String(10), nullable=True)
    schedule_days = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    def set_points(self, points: list) -> None:
        """Serialise list of dicts to JSON."""
        self.points_json = json.dumps(points)

    def get_points(self) -> list:
        """Deserialise JSON to list of dicts."""
        if self.points_json:
            return json.loads(self.points_json)
        return []
