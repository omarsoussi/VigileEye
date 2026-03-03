"""Use case: Get camera by ID."""
from __future__ import annotations
from uuid import UUID

from application.services.memberships_client import get_membership_permission_for_camera
from typing import Optional
from domain.entities.camera import Camera
from domain.exceptions import CameraNotFoundException
from domain.repositories.camera_repository import CameraRepositoryInterface


class GetCameraUseCase:
    """Use case to get a camera by ID."""

    def __init__(self, camera_repo: CameraRepositoryInterface):
        self.camera_repo = camera_repo

    def execute(
        self,
        camera_id: UUID,
        user_id: UUID,
        *,
        requester_token: str | None = None,
        members_service_url: str = "",
        members_timeout_seconds: float = 2.0,
    ) -> Camera:
        """Get camera by ID.

        Access is granted if:
        - user owns the camera, OR
        - membership service is configured and user has a membership for the camera.
        """
        camera = self.camera_repo.get_by_id(camera_id)
        if not camera:
            raise CameraNotFoundException(f"Camera {camera_id} not found")

        if camera.owner_user_id != user_id:
            if requester_token and members_service_url:
                perm = get_membership_permission_for_camera(
                    members_service_url=members_service_url,
                    token=requester_token,
                    camera_id=camera_id,
                    timeout_seconds=members_timeout_seconds,
                )
                if perm in {"reader", "editor"}:
                    return camera

            raise CameraNotFoundException(f"Camera {camera_id} not found")
        return camera
