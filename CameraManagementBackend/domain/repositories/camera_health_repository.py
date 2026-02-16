"""Abstract repository interface for camera health."""
from abc import ABC, abstractmethod
from typing import Optional
from uuid import UUID
from domain.entities.camera_health import CameraHealth


class CameraHealthRepositoryInterface(ABC):
    """Abstract repository for camera health monitoring."""

    @abstractmethod
    def record_health(self, health: CameraHealth) -> CameraHealth:
        """Record a health check for a camera."""
        pass

    @abstractmethod
    def get_latest_health(self, camera_id: UUID) -> Optional[CameraHealth]:
        """Get latest health record for a camera."""
        pass

    @abstractmethod
    def get_health_history(self, camera_id: UUID, limit: int = 100) -> list[CameraHealth]:
        """Get health history for a camera."""
        pass
