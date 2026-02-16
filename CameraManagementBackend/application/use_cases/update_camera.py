"""Use case: Update camera."""
from __future__ import annotations
from uuid import UUID
from domain.entities.camera import Camera, CameraLocation
from domain.exceptions import CameraNotFoundException
from domain.repositories.camera_repository import CameraRepositoryInterface


class UpdateCameraUseCase:
    """Use case to update a camera."""

    def __init__(self, camera_repo: CameraRepositoryInterface):
        self.camera_repo = camera_repo

    def execute(
        self,
        camera_id: UUID,
        user_id: UUID,
        name: str | None = None,
        description: str | None = None,
        stream_url: str | None = None,
        resolution: str | None = None,
        fps: int | None = None,
        encoding: str | None = None,
        location: dict | None = None,
    ) -> Camera:
        """Update camera configuration."""
        camera = self.camera_repo.get_by_id(camera_id)
        if not camera:
            raise CameraNotFoundException(f"Camera {camera_id} not found")
        if camera.owner_user_id != user_id:
            raise CameraNotFoundException(f"Camera {camera_id} not found")

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

        camera.update_config(
            name=name,
            description=description,
            stream_url=stream_url,
            resolution=resolution,
            fps=fps,
            encoding=encoding,
            location=location_obj,
        )

        return self.camera_repo.update(camera)
