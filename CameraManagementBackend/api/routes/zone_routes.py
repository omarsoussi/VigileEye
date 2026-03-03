"""Zone API Routes."""
from __future__ import annotations
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from collections import Counter

from api.dependencies.auth_deps import CurrentUser, get_current_user
from application.dtos.zone_requests import CreateZoneRequest, UpdateZoneRequest
from application.dtos.zone_responses import ZoneResponse, ZonePointResponse, ZoneStatsResponse
from application.dtos.camera_responses import MessageResponse
from application.use_cases.create_zone import CreateZoneUseCase
from application.use_cases.list_zones import ListZonesByCameraUseCase, ListZonesByOwnerUseCase
from application.use_cases.update_zone import UpdateZoneUseCase
from application.use_cases.delete_zone import DeleteZoneUseCase
from application.use_cases.toggle_zone import ToggleZoneUseCase
from domain.entities.zone import Zone
from domain.entities.camera_access import CameraPermission
from domain.exceptions import CameraNotFoundException
from infrastructure.config.settings import settings
from infrastructure.persistence.database import get_db
from infrastructure.persistence.repositories import (
    SQLAlchemyCameraRepository,
    SQLAlchemyZoneRepository,
    SQLAlchemyCameraAccessRepository,
)

router = APIRouter(prefix="/api/v1/zones", tags=["Zones"])


def _zone_to_response(zone: Zone) -> ZoneResponse:
    """Convert zone entity to response DTO."""
    return ZoneResponse(
        id=str(zone.id),
        camera_id=str(zone.camera_id),
        owner_user_id=str(zone.owner_user_id),
        name=zone.name,
        zone_type=zone.zone_type.value,
        severity=zone.severity.value,
        points=[ZonePointResponse(x=p.x, y=p.y) for p in zone.points],
        color=zone.color,
        is_active=zone.is_active,
        description=zone.description,
        sensitivity=zone.sensitivity,
        min_trigger_duration=zone.min_trigger_duration,
        alert_cooldown=zone.alert_cooldown,
        schedule_enabled=zone.schedule_enabled,
        schedule_start=zone.schedule_start,
        schedule_end=zone.schedule_end,
        schedule_days=zone.schedule_days,
        created_at=zone.created_at,
        updated_at=zone.updated_at,
    )


# ── Create ───────────────────────────────────────────────────────────
@router.post("", response_model=ZoneResponse, status_code=status.HTTP_201_CREATED)
def create_zone(
    request: CreateZoneRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Create a new detection zone on a camera."""
    zone_repo = SQLAlchemyZoneRepository(db)
    camera_repo = SQLAlchemyCameraRepository(db)
    access_repo = SQLAlchemyCameraAccessRepository(db)
    use_case = CreateZoneUseCase(zone_repo, camera_repo, access_repo)

    try:
        zone = use_case.execute(
            camera_id=UUID(request.camera_id),
            owner_user_id=current_user.id,
            name=request.name,
            zone_type=request.zone_type,
            points=[{"x": p.x, "y": p.y} for p in request.points],
            requester_token=current_user.token,
            members_service_url=settings.members_service_url,
            members_timeout_seconds=settings.members_service_timeout_seconds,
            color=request.color,
            severity=request.severity,
            description=request.description,
            sensitivity=request.sensitivity,
            min_trigger_duration=request.min_trigger_duration,
            alert_cooldown=request.alert_cooldown,
            schedule_enabled=request.schedule_enabled,
            schedule_start=request.schedule_start,
            schedule_end=request.schedule_end,
            schedule_days=request.schedule_days,
        )
        return _zone_to_response(zone)
    except CameraNotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


# ── List all user zones ──────────────────────────────────────────────
@router.get("", response_model=List[ZoneResponse])
def list_my_zones(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """List all detection zones owned by the current user."""
    zone_repo = SQLAlchemyZoneRepository(db)
    use_case = ListZonesByOwnerUseCase(zone_repo)
    zones = use_case.execute(current_user.id)
    return [_zone_to_response(z) for z in zones]


# ── Stats ────────────────────────────────────────────────────────────
@router.get("/stats", response_model=ZoneStatsResponse)
def get_zone_stats(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Get zone statistics for the current user."""
    zone_repo = SQLAlchemyZoneRepository(db)
    zones = zone_repo.get_by_owner(current_user.id)

    type_counter = Counter(z.zone_type.value for z in zones)
    severity_counter = Counter(z.severity.value for z in zones)
    cameras_with_zones = len(set(z.camera_id for z in zones))

    return ZoneStatsResponse(
        total_zones=len(zones),
        active_zones=sum(1 for z in zones if z.is_active),
        zones_by_type=dict(type_counter),
        zones_by_severity=dict(severity_counter),
        cameras_with_zones=cameras_with_zones,
    )


# ── List by camera ──────────────────────────────────────────────────
@router.get("/camera/{camera_id}", response_model=List[ZoneResponse])
def list_camera_zones(
    camera_id: UUID,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """List all detection zones for a specific camera."""
    # Verify ownership OR that user has at least view access
    camera_repo = SQLAlchemyCameraRepository(db)
    camera = camera_repo.get_by_id(camera_id)
    if not camera:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Camera not found")
    if camera.owner_user_id != current_user.id:
        access_repo = SQLAlchemyCameraAccessRepository(db)
        access = access_repo.get_access(camera_id=camera_id, user_id=current_user.id)
        allowed = bool(access)

        if not allowed and current_user.token and settings.members_service_url:
            from application.services.memberships_client import get_membership_permission_for_camera

            perm = get_membership_permission_for_camera(
                members_service_url=settings.members_service_url,
                token=current_user.token,
                camera_id=camera_id,
                timeout_seconds=settings.members_service_timeout_seconds,
            )
            allowed = perm in {"reader", "editor"}

        if not allowed:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Camera not found")

    zone_repo = SQLAlchemyZoneRepository(db)
    use_case = ListZonesByCameraUseCase(zone_repo)
    zones = use_case.execute(camera_id)
    return [_zone_to_response(z) for z in zones]


# ── Get single ───────────────────────────────────────────────────────
@router.get("/{zone_id}", response_model=ZoneResponse)
def get_zone(
    zone_id: UUID,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Get a detection zone by ID."""
    zone_repo = SQLAlchemyZoneRepository(db)
    zone = zone_repo.get_by_id(zone_id)
    if not zone:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Zone not found")
    if zone.owner_user_id != current_user.id:
        access_repo = SQLAlchemyCameraAccessRepository(db)
        access = access_repo.get_access(camera_id=zone.camera_id, user_id=current_user.id)
        allowed = bool(access)

        if not allowed and current_user.token and settings.members_service_url:
            from application.services.memberships_client import get_membership_permission_for_camera

            perm = get_membership_permission_for_camera(
                members_service_url=settings.members_service_url,
                token=current_user.token,
                camera_id=zone.camera_id,
                timeout_seconds=settings.members_service_timeout_seconds,
            )
            allowed = perm in {"reader", "editor"}

        if not allowed:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Zone not found")
    return _zone_to_response(zone)


# ── Update ───────────────────────────────────────────────────────────
@router.put("/{zone_id}", response_model=ZoneResponse)
def update_zone(
    zone_id: UUID,
    request: UpdateZoneRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Update a detection zone."""
    zone_repo = SQLAlchemyZoneRepository(db)
    access_repo = SQLAlchemyCameraAccessRepository(db)
    use_case = UpdateZoneUseCase(zone_repo, access_repo)

    update_data = request.model_dump(exclude_unset=True)
    # Convert points from Pydantic models to dicts
    if "points" in update_data and update_data["points"] is not None:
        update_data["points"] = [{"x": p.x, "y": p.y} for p in request.points]

    try:
        zone = use_case.execute(
            zone_id=zone_id,
            user_id=current_user.id,
            requester_token=current_user.token,
            members_service_url=settings.members_service_url,
            members_timeout_seconds=settings.members_service_timeout_seconds,
            **update_data,
        )
        return _zone_to_response(zone)
    except CameraNotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


# ── Toggle active state ─────────────────────────────────────────────
@router.post("/{zone_id}/activate", response_model=ZoneResponse)
def activate_zone(
    zone_id: UUID,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Activate a detection zone."""
    zone_repo = SQLAlchemyZoneRepository(db)
    access_repo = SQLAlchemyCameraAccessRepository(db)
    use_case = ToggleZoneUseCase(zone_repo, access_repo)
    try:
        zone = use_case.execute(
            zone_id,
            current_user.id,
            requester_token=current_user.token,
            members_service_url=settings.members_service_url,
            members_timeout_seconds=settings.members_service_timeout_seconds,
            active=True,
        )
        return _zone_to_response(zone)
    except CameraNotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/{zone_id}/deactivate", response_model=ZoneResponse)
def deactivate_zone(
    zone_id: UUID,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Deactivate a detection zone."""
    zone_repo = SQLAlchemyZoneRepository(db)
    access_repo = SQLAlchemyCameraAccessRepository(db)
    use_case = ToggleZoneUseCase(zone_repo, access_repo)
    try:
        zone = use_case.execute(
            zone_id,
            current_user.id,
            requester_token=current_user.token,
            members_service_url=settings.members_service_url,
            members_timeout_seconds=settings.members_service_timeout_seconds,
            active=False,
        )
        return _zone_to_response(zone)
    except CameraNotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


# ── Delete ───────────────────────────────────────────────────────────
@router.delete("/{zone_id}", response_model=MessageResponse)
def delete_zone(
    zone_id: UUID,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Delete a detection zone."""
    zone_repo = SQLAlchemyZoneRepository(db)
    access_repo = SQLAlchemyCameraAccessRepository(db)
    use_case = DeleteZoneUseCase(zone_repo, access_repo)
    try:
        use_case.execute(
            zone_id,
            current_user.id,
            requester_token=current_user.token,
            members_service_url=settings.members_service_url,
            members_timeout_seconds=settings.members_service_timeout_seconds,
        )
        return MessageResponse(message="Zone deleted successfully")
    except CameraNotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
