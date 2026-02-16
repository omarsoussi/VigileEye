"""Use case: Create a new camera."""
from __future__ import annotations
from uuid import UUID
from sqlalchemy.orm import Session
from domain.entities.camera import Camera, CameraType, CameraLocation
from domain.repositories.camera_repository import CameraRepositoryInterface
from infrastructure.persistence.repositories import SQLAlchemyCameraRepository


class CreateCameraUseCase:
    """Use case for creating a new camera."""

    def __init__(self, camera_repo: CameraRepositoryInterface):
        self.camera_repo = camera_repo

    def execute(
        self,
        owner_user_id: UUID,
        name: str,
        stream_url: str,
        protocol: str,
        resolution: str,
        fps: int,
        encoding: str,
        camera_type: CameraType,
        description: str | None = None,
        username: str | None = None,
        password: str | None = None,
        location: dict | None = None,
    ) -> Camera:
        """Create a new camera for the user."""
        # Parse location
        location_obj = None
        if location:
            location_obj = CameraLocation(
                building=location.get("building"),
                floor=location.get("floor"),
                zone=location.get("zone"),
                room=location.get("room"),
                gps_lat=location.get("gps_lat"),
                gps_long=location.get("gps_long"),
            )

        # Create domain entity
        camera = Camera.create(
            owner_user_id=owner_user_id,
            name=name,
            stream_url=stream_url,
            protocol=protocol,
            resolution=resolution,
            fps=fps,
            encoding=encoding,
            camera_type=camera_type,
            description=description,
            username=username,
            password=password,
            location=location_obj,
        )

        # Persist
        return self.camera_repo.create(camera)
