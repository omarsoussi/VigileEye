"""Use case: Delete camera."""
from __future__ import annotations
from uuid import UUID
from domain.exceptions import CameraNotFoundException
from domain.repositories.camera_repository import CameraRepositoryInterface


class DeleteCameraUseCase:
    """Use case to delete a camera."""

    def __init__(self, camera_repo: CameraRepositoryInterface):
        self.camera_repo = camera_repo

    def execute(self, camera_id: UUID, user_id: UUID) -> None:
        """Delete a camera owned by the user."""
        camera = self.camera_repo.get_by_id(camera_id)
        if not camera:
            raise CameraNotFoundException(f"Camera {camera_id} not found")
        if camera.owner_user_id != user_id:
            raise CameraNotFoundException(f"Camera {camera_id} not found")
        
        self.camera_repo.delete(camera_id)
