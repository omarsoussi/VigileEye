"""Use case: Create a detection zone."""
from __future__ import annotations
from uuid import UUID
from application.services.memberships_client import get_membership_permission_for_camera
from domain.entities.zone import Zone, ZoneType, ZoneSeverity
from domain.entities.camera_access import CameraPermission
from domain.exceptions import CameraNotFoundException
from domain.repositories.camera_access_repository import CameraAccessRepositoryInterface
from domain.repositories.camera_repository import CameraRepositoryInterface
from domain.repositories.zone_repository import ZoneRepositoryInterface


class CreateZoneUseCase:
    """Use case for creating a new detection zone on a camera."""

    def __init__(
        self,
        zone_repo: ZoneRepositoryInterface,
        camera_repo: CameraRepositoryInterface,
        access_repo: CameraAccessRepositoryInterface,
    ):
        self.zone_repo = zone_repo
        self.camera_repo = camera_repo
        self.access_repo = access_repo

    def execute(
        self,
        camera_id: UUID,
        owner_user_id: UUID,
        name: str,
        zone_type: ZoneType,
        points: list[dict],
        requester_token: str | None = None,
        members_service_url: str = "",
        members_timeout_seconds: float = 2.0,
        color: str = "#ef4444",
        severity: ZoneSeverity = ZoneSeverity.MEDIUM,
        description: str | None = None,
        sensitivity: int = 50,
        min_trigger_duration: int = 3,
        alert_cooldown: int = 30,
        schedule_enabled: bool = False,
        schedule_start: str | None = None,
        schedule_end: str | None = None,
        schedule_days: str | None = None,
    ) -> Zone:
        # Verify camera exists and user can manage it
        camera = self.camera_repo.get_by_id(camera_id)
        if not camera:
            raise CameraNotFoundException(f"Camera {camera_id} not found")

        if camera.owner_user_id != owner_user_id:
            access = self.access_repo.get_access(camera_id=camera_id, user_id=owner_user_id)
            allowed = bool(access and access.permission == CameraPermission.MANAGE)

            if not allowed and requester_token and members_service_url:
                perm = get_membership_permission_for_camera(
                    members_service_url=members_service_url,
                    token=requester_token,
                    camera_id=camera_id,
                    timeout_seconds=members_timeout_seconds,
                )
                allowed = perm == "editor"

            if not allowed:
                # Keep 404 semantics to avoid leaking camera existence
                raise CameraNotFoundException(f"Camera {camera_id} not found")

            # Zones should remain owned by the camera owner even if created by a manager.
            owner_user_id = camera.owner_user_id

        zone = Zone.create(
            camera_id=camera_id,
            owner_user_id=owner_user_id,
            name=name,
            zone_type=zone_type,
            points=points,
            color=color,
            severity=severity,
            description=description,
            sensitivity=sensitivity,
            min_trigger_duration=min_trigger_duration,
            alert_cooldown=alert_cooldown,
            schedule_enabled=schedule_enabled,
            schedule_start=schedule_start,
            schedule_end=schedule_end,
            schedule_days=schedule_days,
        )
        return self.zone_repo.create(zone)
