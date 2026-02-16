"""Use case: Get stream status."""
from __future__ import annotations

from typing import Optional
from uuid import UUID

from domain.entities.stream_session import StreamSession, StreamStatus
from domain.repositories.stream_session_repository import StreamSessionRepositoryInterface


class GetStreamStatusUseCase:
    """
    Use case for checking the status of a stream.
    """

    def __init__(self, session_repository: StreamSessionRepositoryInterface):
        self.session_repository = session_repository

    def execute(self, camera_id: UUID) -> tuple[bool, Optional[StreamSession]]:
        """
        Get the stream status for a camera.
        
        Args:
            camera_id: ID of the camera
            
        Returns:
            Tuple of (is_streaming, session)
        """
        session = self.session_repository.get_by_camera_id(camera_id)
        if not session:
            return False, None

        is_streaming = session.status in (
            StreamStatus.ACTIVE,
            StreamStatus.CONNECTING,
            StreamStatus.RECONNECTING,
        )
        return is_streaming, session
