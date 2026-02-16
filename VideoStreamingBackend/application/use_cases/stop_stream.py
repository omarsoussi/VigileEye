"""Use case: Stop a video stream."""
from __future__ import annotations

from uuid import UUID

from domain.entities.stream_session import StreamSession
from domain.exceptions import StreamNotFoundException
from domain.repositories.stream_session_repository import StreamSessionRepositoryInterface


class StopStreamUseCase:
    """
    Use case for stopping a video stream session.
    """

    def __init__(self, session_repository: StreamSessionRepositoryInterface):
        self.session_repository = session_repository

    def execute(self, camera_id: UUID) -> StreamSession:
        """
        Stop a stream session for a camera.
        
        Args:
            camera_id: ID of the camera
            
        Returns:
            The stopped stream session
            
        Raises:
            StreamNotFoundException: If no active session exists
        """
        session = self.session_repository.get_by_camera_id(camera_id)
        if not session:
            raise StreamNotFoundException(f"No stream session found for camera {camera_id}")

        session.stop()
        return self.session_repository.update(session)
