"""Use case: Toggle zone active state."""
from __future__ import annotations
from uuid import UUID
from application.services.memberships_client import get_membership_permission_for_camera
from domain.entities.zone import Zone
from domain.entities.camera_access import CameraPermission
from domain.exceptions import CameraNotFoundException
from domain.repositories.camera_access_repository import CameraAccessRepositoryInterface
from domain.repositories.zone_repository import ZoneRepositoryInterface


class ToggleZoneUseCase:
    """Use case to enable or disable a detection zone."""

    def __init__(self, zone_repo: ZoneRepositoryInterface, access_repo: CameraAccessRepositoryInterface):
        self.zone_repo = zone_repo
        self.access_repo = access_repo

    def execute(
        self,
        zone_id: UUID,
        user_id: UUID,
        *,
        requester_token: str | None = None,
        members_service_url: str = "",
        members_timeout_seconds: float = 2.0,
        active: bool,
    ) -> Zone:
        zone = self.zone_repo.get_by_id(zone_id)
        if not zone:
            raise CameraNotFoundException(f"Zone {zone_id} not found")

        if zone.owner_user_id != user_id:
            access = self.access_repo.get_access(camera_id=zone.camera_id, user_id=user_id)
            allowed = bool(access and access.permission == CameraPermission.MANAGE)
            if not allowed and requester_token and members_service_url:
                perm = get_membership_permission_for_camera(
                    members_service_url=members_service_url,
                    token=requester_token,
                    camera_id=zone.camera_id,
                    timeout_seconds=members_timeout_seconds,
                )
                allowed = perm == "editor"

            if not allowed:
                raise CameraNotFoundException(f"Zone {zone_id} not found")

        if active:
            zone.activate()
        else:
            zone.deactivate()
        return self.zone_repo.update(zone)
