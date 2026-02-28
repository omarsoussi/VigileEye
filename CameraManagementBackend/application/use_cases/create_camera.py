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

    @staticmethod
    def _detect_protocol(stream_url: str, protocol_hint: str | None = None) -> str:
        """Auto-detect the streaming protocol from the URL."""
        url_lower = stream_url.lower().strip()
        if url_lower.startswith("rtsp://"):
            return "rtsp"
        if url_lower.startswith("rtmp://"):
            return "rtmp"
        if url_lower.startswith("onvif://"):
            return "onvif"
        if ".m3u8" in url_lower or "/hls/" in url_lower:
            return "hls"
        if url_lower.startswith("http://") or url_lower.startswith("https://"):
            return "http"
        # Fall back to hint from client, or rtsp as default
        return protocol_hint or "rtsp"

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
        # Auto-detect protocol from URL
        resolved_protocol = self._detect_protocol(stream_url, protocol)

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
            protocol=resolved_protocol,
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
