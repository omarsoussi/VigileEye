"""Use case: List user's cameras."""
from __future__ import annotations
from uuid import UUID
from typing import List

from application.services.memberships_client import (
    build_shared_camera_permission_map,
    fetch_my_memberships,
)
from domain.entities.camera import Camera
from domain.repositories.camera_repository import CameraRepositoryInterface


class ListUserCamerasUseCase:
    """Use case to list all cameras owned by a user."""

    def __init__(self, camera_repo: CameraRepositoryInterface):
        self.camera_repo = camera_repo

    def execute(
        self,
        user_id: UUID,
        *,
        requester_token: str | None = None,
        members_service_url: str = "",
        members_timeout_seconds: float = 2.0,
    ) -> List[Camera]:
        """List cameras accessible by the user.

        Always returns cameras owned by the user.
        If MembersInvitation integration is enabled, also returns shared cameras.
        """

        owned = self.camera_repo.get_by_owner(user_id)
        if not (requester_token and members_service_url):
            return owned

        memberships = fetch_my_memberships(
            members_service_url=members_service_url,
            token=requester_token,
            timeout_seconds=members_timeout_seconds,
        )
        shared_perm_map = build_shared_camera_permission_map(memberships)
        shared_ids = list(shared_perm_map.keys())
        if not shared_ids:
            return owned

        shared = self.camera_repo.get_by_ids(shared_ids)
        owned_ids = {c.id for c in owned}
        return owned + [c for c in shared if c.id not in owned_ids]
