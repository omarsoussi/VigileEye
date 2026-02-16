"""Abstract repository interface for camera access."""
from abc import ABC, abstractmethod
from typing import List, Optional
from uuid import UUID
from domain.entities.camera_access import CameraAccess


class CameraAccessRepositoryInterface(ABC):
    """Abstract repository for camera access control."""

    @abstractmethod
    def grant_access(self, access: CameraAccess) -> CameraAccess:
        """Grant access to a user for a camera."""
        pass

    @abstractmethod
    def revoke_access(self, camera_id: UUID, user_id: UUID) -> None:
        """Revoke user access to a camera."""
        pass

    @abstractmethod
    def get_access(self, camera_id: UUID, user_id: UUID) -> Optional[CameraAccess]:
        """Get access record for user/camera pair."""
        pass

    @abstractmethod
    def list_user_cameras(self, user_id: UUID) -> List[UUID]:
        """List all cameras accessible by a user."""
        pass

    @abstractmethod
    def list_camera_users(self, camera_id: UUID) -> List[CameraAccess]:
        """List all users with access to a camera."""
        pass
