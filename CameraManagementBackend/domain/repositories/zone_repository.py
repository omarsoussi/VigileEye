"""Abstract repository interface for zones."""
from abc import ABC, abstractmethod
from typing import List, Optional
from uuid import UUID
from domain.entities.zone import Zone


class ZoneRepositoryInterface(ABC):
    """Abstract repository for detection zones."""

    @abstractmethod
    def create(self, zone: Zone) -> Zone:
        """Persist a new zone."""
        pass

    @abstractmethod
    def get_by_id(self, zone_id: UUID) -> Optional[Zone]:
        """Get a zone by ID."""
        pass

    @abstractmethod
    def get_by_camera(self, camera_id: UUID) -> List[Zone]:
        """List all zones for a camera."""
        pass

    @abstractmethod
    def get_by_owner(self, owner_user_id: UUID) -> List[Zone]:
        """List all zones owned by a user."""
        pass

    @abstractmethod
    def update(self, zone: Zone) -> Zone:
        """Update an existing zone."""
        pass

    @abstractmethod
    def delete(self, zone_id: UUID) -> None:
        """Delete a zone."""
        pass

    @abstractmethod
    def delete_by_camera(self, camera_id: UUID) -> int:
        """Delete all zones for a camera. Returns count of deleted."""
        pass
