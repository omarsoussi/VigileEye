"""Use case: Record camera health / heartbeat."""
from __future__ import annotations
from uuid import UUID
from domain.entities.camera_health import CameraHealth
from domain.exceptions import CameraNotFoundException
from domain.repositories.camera_repository import CameraRepositoryInterface
from domain.repositories.camera_health_repository import CameraHealthRepositoryInterface


class RecordHealthUseCase:
    """Use case to record camera health metrics."""

    def __init__(
        self,
        camera_repo: CameraRepositoryInterface,
        health_repo: CameraHealthRepositoryInterface,
    ):
        self.camera_repo = camera_repo
        self.health_repo = health_repo

    def execute(
        self,
        camera_id: UUID,
        latency_ms: int = 0,
        frame_drop_rate: float = 0.0,
        uptime_percentage: float = 100.0,
    ) -> CameraHealth:
        """Record health and mark camera as online."""
        camera = self.camera_repo.get_by_id(camera_id)
        if not camera:
            raise CameraNotFoundException(f"Camera {camera_id} not found")

        # Mark camera online
        camera.mark_online()
        self.camera_repo.update(camera)

        # Record health
        health = CameraHealth.create(
            camera_id=camera_id,
            latency_ms=latency_ms,
            frame_drop_rate=frame_drop_rate,
            uptime_percentage=uptime_percentage,
        )
        return self.health_repo.record_health(health)
