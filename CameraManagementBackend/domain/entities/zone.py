"""Zone domain entity for detection regions on camera feeds."""
from __future__ import annotations
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Optional, List
from uuid import UUID, uuid4


class ZoneType(str, Enum):
    """Type of detection zone."""
    INTRUSION = "intrusion"       # Detect unauthorized entry
    MOTION = "motion"             # Detect any motion
    LOITERING = "loitering"       # Detect prolonged presence
    LINE_CROSS = "line_cross"     # Detect crossing a virtual line
    CROWD = "crowd"               # Detect crowd gathering
    RESTRICTED = "restricted"     # Fully restricted area
    COUNTING = "counting"         # People / vehicle counting


class ZoneSeverity(str, Enum):
    """Alert severity for a zone."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class ZonePoint:
    """A single point in a zone polygon (normalised 0-1 coords)."""
    x: float
    y: float


@dataclass
class Zone:
    """Detection zone entity linked to a camera."""
    id: UUID
    camera_id: UUID
    owner_user_id: UUID
    name: str
    zone_type: ZoneType
    severity: ZoneSeverity
    # Polygon points as list of {x, y} normalised coordinates (0-1)
    points: List[ZonePoint]
    color: str                            # Hex colour for UI rendering
    is_active: bool
    description: Optional[str] = None
    # Detection sensitivity 0-100
    sensitivity: int = 50
    # Minimum seconds before alert triggers (anti-flicker)
    min_trigger_duration: int = 3
    # Cooldown seconds between consecutive alerts
    alert_cooldown: int = 30
    # Schedule – simple JSON-friendly fields
    schedule_enabled: bool = False
    schedule_start: Optional[str] = None  # "HH:MM"
    schedule_end: Optional[str] = None    # "HH:MM"
    schedule_days: Optional[str] = None   # Comma separated: "mon,tue,wed"
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    @staticmethod
    def create(
        camera_id: UUID,
        owner_user_id: UUID,
        name: str,
        zone_type: ZoneType,
        points: List[dict],
        color: str = "#ef4444",
        severity: ZoneSeverity = ZoneSeverity.MEDIUM,
        description: Optional[str] = None,
        sensitivity: int = 50,
        min_trigger_duration: int = 3,
        alert_cooldown: int = 30,
        schedule_enabled: bool = False,
        schedule_start: Optional[str] = None,
        schedule_end: Optional[str] = None,
        schedule_days: Optional[str] = None,
    ) -> Zone:
        """Factory method to create a new zone."""
        zone_points = [ZonePoint(x=p["x"], y=p["y"]) for p in points]
        return Zone(
            id=uuid4(),
            camera_id=camera_id,
            owner_user_id=owner_user_id,
            name=name,
            zone_type=zone_type,
            severity=severity,
            points=zone_points,
            color=color,
            is_active=True,
            description=description,
            sensitivity=sensitivity,
            min_trigger_duration=min_trigger_duration,
            alert_cooldown=alert_cooldown,
            schedule_enabled=schedule_enabled,
            schedule_start=schedule_start,
            schedule_end=schedule_end,
            schedule_days=schedule_days,
        )

    def update(self, **kwargs) -> None:
        """Update zone attributes."""
        for key, value in kwargs.items():
            if value is not None and hasattr(self, key):
                if key == "points":
                    setattr(self, key, [ZonePoint(x=p["x"], y=p["y"]) for p in value])
                else:
                    setattr(self, key, value)
        self.updated_at = datetime.now(timezone.utc)

    def activate(self) -> None:
        self.is_active = True
        self.updated_at = datetime.now(timezone.utc)

    def deactivate(self) -> None:
        self.is_active = False
        self.updated_at = datetime.now(timezone.utc)
