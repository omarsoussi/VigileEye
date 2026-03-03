"""Camera API Routes."""
from __future__ import annotations
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List

from api.dependencies.auth_deps import CurrentUser, get_current_user
from application.dtos.camera_requests import (
    CreateCameraRequest,
    UpdateCameraRequest,
    RecordHealthRequest,
)
from application.dtos.camera_responses import (
    CameraResponse,
    CameraLocationResponse,
    CameraHealthResponse,
    MessageResponse,
)
from application.use_cases.create_camera import CreateCameraUseCase
from application.use_cases.list_user_cameras import ListUserCamerasUseCase
from application.use_cases.get_camera import GetCameraUseCase
from application.use_cases.update_camera import UpdateCameraUseCase
from application.use_cases.delete_camera import DeleteCameraUseCase
from application.use_cases.toggle_camera import EnableCameraUseCase, DisableCameraUseCase
from application.use_cases.record_health import RecordHealthUseCase
from domain.entities.camera import Camera
from domain.exceptions import CameraNotFoundException
from infrastructure.config.settings import settings
from infrastructure.persistence.database import get_db
from infrastructure.persistence.repositories import (
    SQLAlchemyCameraRepository,
    SQLAlchemyCameraHealthRepository,
)

router = APIRouter(prefix="/api/v1/cameras", tags=["Cameras"])


def _camera_to_response(camera: Camera) -> CameraResponse:
    """Convert camera entity to response."""
    location = None
    if camera.location:
        location = CameraLocationResponse(
            building=camera.location.building,
            floor=camera.location.floor,
            zone=camera.location.zone,
            room=camera.location.room,
            gps_lat=camera.location.gps_lat,
            gps_long=camera.location.gps_long,
        )
    
    return CameraResponse(
        id=str(camera.id),
        owner_user_id=str(camera.owner_user_id),
        name=camera.name,
        description=camera.description,
        stream_url=camera.stream_url,
        protocol=camera.protocol,
        resolution=camera.resolution,
        fps=camera.fps,
        encoding=camera.encoding,
        status=camera.status.value,
        camera_type=camera.camera_type.value,
        is_active=camera.is_active,
        location=location,
        last_heartbeat=camera.last_heartbeat,
        created_at=camera.created_at,
        updated_at=camera.updated_at,
    )


@router.post("", response_model=CameraResponse, status_code=status.HTTP_201_CREATED)
def create_camera(
    request: CreateCameraRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Create a new camera."""
    repo = SQLAlchemyCameraRepository(db)
    use_case = CreateCameraUseCase(repo)
    
    location_dict = request.location.model_dump() if request.location else None
    
    camera = use_case.execute(
        owner_user_id=current_user.id,
        name=request.name,
        stream_url=request.stream_url,
        protocol=request.protocol,
        resolution=request.resolution,
        fps=request.fps,
        encoding=request.encoding,
        camera_type=request.camera_type,
        description=request.description,
        username=request.username,
        password=request.password,
        location=location_dict,
    )
    
    return _camera_to_response(camera)


@router.get("", response_model=List[CameraResponse])
def list_cameras(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """List all cameras owned by the current user."""
    repo = SQLAlchemyCameraRepository(db)
    use_case = ListUserCamerasUseCase(repo)
    cameras = use_case.execute(
        current_user.id,
        requester_token=current_user.token,
        members_service_url=settings.members_service_url,
        members_timeout_seconds=settings.members_service_timeout_seconds,
    )
    return [_camera_to_response(c) for c in cameras]


@router.get("/batch", response_model=List[CameraResponse])
def get_cameras_batch(
    ids: str = Query(..., description="Comma-separated camera UUIDs"),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Get multiple cameras by IDs. Used for viewing shared cameras (via memberships)."""
    from uuid import UUID as _UUID
    camera_ids = []
    for raw_id in ids.split(","):
        raw_id = raw_id.strip()
        if raw_id:
            try:
                camera_ids.append(_UUID(raw_id))
            except ValueError:
                continue
    if not camera_ids:
        return []
    repo = SQLAlchemyCameraRepository(db)
    cameras = repo.get_by_ids(camera_ids)

    # Enforce access: owner or membership (reader/editor)
    shared_perm_map = {}
    if current_user.token and settings.members_service_url:
        from application.services.memberships_client import fetch_my_memberships, build_shared_camera_permission_map

        memberships = fetch_my_memberships(
            members_service_url=settings.members_service_url,
            token=current_user.token,
            timeout_seconds=settings.members_service_timeout_seconds,
        )
        shared_perm_map = build_shared_camera_permission_map(memberships)

    cameras = [
        c
        for c in cameras
        if (c.owner_user_id == current_user.id) or (c.id in shared_perm_map)
    ]
    return [_camera_to_response(c) for c in cameras]


@router.get("/{camera_id}", response_model=CameraResponse)
def get_camera(
    camera_id: UUID,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Get a camera by ID."""
    repo = SQLAlchemyCameraRepository(db)
    use_case = GetCameraUseCase(repo)
    try:
        camera = use_case.execute(
            camera_id,
            current_user.id,
            requester_token=current_user.token,
            members_service_url=settings.members_service_url,
            members_timeout_seconds=settings.members_service_timeout_seconds,
        )
        return _camera_to_response(camera)
    except CameraNotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.put("/{camera_id}", response_model=CameraResponse)
def update_camera(
    camera_id: UUID,
    request: UpdateCameraRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Update a camera."""
    repo = SQLAlchemyCameraRepository(db)
    use_case = UpdateCameraUseCase(repo)
    
    location_dict = request.location.model_dump() if request.location else None
    
    try:
        camera = use_case.execute(
            camera_id=camera_id,
            user_id=current_user.id,
            name=request.name,
            description=request.description,
            stream_url=request.stream_url,
            resolution=request.resolution,
            fps=request.fps,
            encoding=request.encoding,
            location=location_dict,
        )
        return _camera_to_response(camera)
    except CameraNotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.delete("/{camera_id}", response_model=MessageResponse)
def delete_camera(
    camera_id: UUID,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Delete a camera."""
    repo = SQLAlchemyCameraRepository(db)
    use_case = DeleteCameraUseCase(repo)
    try:
        use_case.execute(camera_id, current_user.id)
        return MessageResponse(message="Camera deleted successfully")
    except CameraNotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/{camera_id}/enable", response_model=CameraResponse)
def enable_camera(
    camera_id: UUID,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Enable a camera."""
    repo = SQLAlchemyCameraRepository(db)
    use_case = EnableCameraUseCase(repo)
    try:
        camera = use_case.execute(camera_id, current_user.id)
        return _camera_to_response(camera)
    except CameraNotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/{camera_id}/disable", response_model=CameraResponse)
def disable_camera(
    camera_id: UUID,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Disable a camera."""
    repo = SQLAlchemyCameraRepository(db)
    use_case = DisableCameraUseCase(repo)
    try:
        camera = use_case.execute(camera_id, current_user.id)
        return _camera_to_response(camera)
    except CameraNotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/{camera_id}/heartbeat", response_model=CameraHealthResponse)
def record_heartbeat(
    camera_id: UUID,
    request: RecordHealthRequest,
    db: Session = Depends(get_db),
):
    """Record camera heartbeat and health metrics."""
    camera_repo = SQLAlchemyCameraRepository(db)
    health_repo = SQLAlchemyCameraHealthRepository(db)
    use_case = RecordHealthUseCase(camera_repo, health_repo)
    try:
        health = use_case.execute(
            camera_id=camera_id,
            latency_ms=request.latency_ms,
            frame_drop_rate=request.frame_drop_rate,
            uptime_percentage=request.uptime_percentage,
        )
        return CameraHealthResponse(
            camera_id=str(health.camera_id),
            last_heartbeat=health.last_heartbeat,
            latency_ms=health.latency_ms,
            frame_drop_rate=health.frame_drop_rate,
            uptime_percentage=health.uptime_percentage,
            recorded_at=health.recorded_at,
        )
    except CameraNotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/{camera_id}/health", response_model=CameraHealthResponse)
def get_camera_health(
    camera_id: UUID,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Get camera health metrics."""
    # Check access
    camera_repo = SQLAlchemyCameraRepository(db)
    camera = camera_repo.get_by_id(camera_id)
    if not camera or camera.owner_user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Camera not found")
    
    health_repo = SQLAlchemyCameraHealthRepository(db)
    health = health_repo.get_latest_health(camera_id)
    if not health:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No health data available")
    
    return CameraHealthResponse(
        camera_id=str(health.camera_id),
        last_heartbeat=health.last_heartbeat,
        latency_ms=health.latency_ms,
        frame_drop_rate=health.frame_drop_rate,
        uptime_percentage=health.uptime_percentage,
        recorded_at=health.recorded_at,
    )
