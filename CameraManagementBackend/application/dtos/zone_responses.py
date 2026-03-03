"""Response DTOs for zone management."""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel


class ZonePointResponse(BaseModel):
    """A single polygon point."""
    x: float
    y: float


class ZoneResponse(BaseModel):
    """Response DTO for a detection zone."""
    id: str
    camera_id: str
    owner_user_id: str
    name: str
    zone_type: str
    severity: str
    points: List[ZonePointResponse]
    color: str
    is_active: bool
    description: Optional[str] = None
    sensitivity: int
    min_trigger_duration: int
    alert_cooldown: int
    schedule_enabled: bool
    schedule_start: Optional[str] = None
    schedule_end: Optional[str] = None
    schedule_days: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class ZoneStatsResponse(BaseModel):
    """Zone statistics for a user."""
    total_zones: int
    active_zones: int
    zones_by_type: dict
    zones_by_severity: dict
    cameras_with_zones: int
