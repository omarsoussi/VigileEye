"""Repository interfaces."""
from abc import ABC, abstractmethod
from typing import List, Optional
from uuid import UUID
from domain.entities.camera import Camera


class CameraRepositoryInterface(ABC):
    """Abstract repository for Camera entity."""

    @abstractmethod
    def create(self, camera: Camera) -> Camera:
        """Create a new camera."""
        pass

    @abstractmethod
    def get_by_id(self, camera_id: UUID) -> Optional[Camera]:
        """Get camera by ID."""
        pass

    @abstractmethod
    def get_by_owner(self, owner_user_id: UUID) -> List[Camera]:
        """Get all cameras owned by a user."""
        pass

    @abstractmethod
    def update(self, camera: Camera) -> Camera:
        """Update an existing camera."""
        pass

    @abstractmethod
    def delete(self, camera_id: UUID) -> None:
        """Delete a camera."""
        pass

    @abstractmethod
    def list_all(self) -> List[Camera]:
        """List all cameras."""
        pass
