"""Use cases: Enable/Disable camera."""
from __future__ import annotations
from uuid import UUID
from domain.entities.camera import Camera
from domain.exceptions import CameraNotFoundException
from domain.repositories.camera_repository import CameraRepositoryInterface


class EnableCameraUseCase:
    """Use case to enable a camera."""

    def __init__(self, camera_repo: CameraRepositoryInterface):
        self.camera_repo = camera_repo

    def execute(self, camera_id: UUID, user_id: UUID) -> Camera:
        """Enable a camera."""
        camera = self.camera_repo.get_by_id(camera_id)
        if not camera:
            raise CameraNotFoundException(f"Camera {camera_id} not found")
        if camera.owner_user_id != user_id:
            raise CameraNotFoundException(f"Camera {camera_id} not found")
        
        camera.enable()
        return self.camera_repo.update(camera)


class DisableCameraUseCase:
    """Use case to disable a camera."""

    def __init__(self, camera_repo: CameraRepositoryInterface):
        self.camera_repo = camera_repo

    def execute(self, camera_id: UUID, user_id: UUID) -> Camera:
        """Disable a camera."""
        camera = self.camera_repo.get_by_id(camera_id)
        if not camera:
            raise CameraNotFoundException(f"Camera {camera_id} not found")
        if camera.owner_user_id != user_id:
            raise CameraNotFoundException(f"Camera {camera_id} not found")
        
        camera.disable()
        return self.camera_repo.update(camera)
