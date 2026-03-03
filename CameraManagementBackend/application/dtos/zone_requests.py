"""Request DTOs for zone management."""
from typing import Optional, List
from pydantic import BaseModel, Field
from domain.entities.zone import ZoneType, ZoneSeverity


class ZonePointRequest(BaseModel):
    """A single polygon point (normalised 0-1)."""
    x: float = Field(..., ge=0, le=1)
    y: float = Field(..., ge=0, le=1)


class CreateZoneRequest(BaseModel):
    """Request to create a detection zone."""
    camera_id: str
    name: str = Field(..., min_length=1, max_length=255)
    zone_type: ZoneType = ZoneType.INTRUSION
    severity: ZoneSeverity = ZoneSeverity.MEDIUM
    points: List[ZonePointRequest] = Field(..., min_length=3)
    color: str = "#ef4444"
    description: Optional[str] = None
    sensitivity: int = Field(50, ge=0, le=100)
    min_trigger_duration: int = Field(3, ge=0)
    alert_cooldown: int = Field(30, ge=0)
    schedule_enabled: bool = False
    schedule_start: Optional[str] = None
    schedule_end: Optional[str] = None
    schedule_days: Optional[str] = None


class UpdateZoneRequest(BaseModel):
    """Request to update a detection zone."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    zone_type: Optional[ZoneType] = None
    severity: Optional[ZoneSeverity] = None
    points: Optional[List[ZonePointRequest]] = None
    color: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    sensitivity: Optional[int] = Field(None, ge=0, le=100)
    min_trigger_duration: Optional[int] = Field(None, ge=0)
    alert_cooldown: Optional[int] = Field(None, ge=0)
    schedule_enabled: Optional[bool] = None
    schedule_start: Optional[str] = None
    schedule_end: Optional[str] = None
    schedule_days: Optional[str] = None
