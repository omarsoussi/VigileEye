"""Use case: List user's cameras."""
from __future__ import annotations
from uuid import UUID
from typing import List
from domain.entities.camera import Camera
from domain.repositories.camera_repository import CameraRepositoryInterface


class ListUserCamerasUseCase:
    """Use case to list all cameras owned by a user."""

    def __init__(self, camera_repo: CameraRepositoryInterface):
        self.camera_repo = camera_repo

    def execute(self, user_id: UUID) -> List[Camera]:
        """List cameras owned by the user."""
        return self.camera_repo.get_by_owner(user_id)
