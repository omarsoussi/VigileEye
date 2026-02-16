"""Camera health monitoring entity."""
from __future__ import annotations
from dataclasses import dataclass, field
from datetime import datetime, timezone
from uuid import UUID, uuid4


@dataclass
class CameraHealth:
    """Camera health monitoring entity."""
    id: UUID
    camera_id: UUID
    last_heartbeat: datetime
    latency_ms: int
    frame_drop_rate: float  # 0.0 to 1.0
    uptime_percentage: float  # 0.0 to 100.0
    recorded_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    @staticmethod
    def create(
        camera_id: UUID,
        latency_ms: int = 0,
        frame_drop_rate: float = 0.0,
        uptime_percentage: float = 100.0,
    ) -> CameraHealth:
        """Create a new camera health record."""
        return CameraHealth(
            id=uuid4(),
            camera_id=camera_id,
            last_heartbeat=datetime.now(timezone.utc),
            latency_ms=latency_ms,
            frame_drop_rate=frame_drop_rate,
            uptime_percentage=uptime_percentage,
            recorded_at=datetime.now(timezone.utc),
        )
