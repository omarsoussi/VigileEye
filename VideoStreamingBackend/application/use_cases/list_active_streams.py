"""Use case: List active streams."""
from __future__ import annotations

from typing import List

from domain.entities.stream_session import StreamSession, StreamStatus
from domain.repositories.stream_session_repository import StreamSessionRepositoryInterface


class ListActiveStreamsUseCase:
    """
    Use case for listing all active stream sessions.
    """

    def __init__(self, session_repository: StreamSessionRepositoryInterface):
        self.session_repository = session_repository

    def execute(self) -> List[StreamSession]:
        """
        Get all active stream sessions.
        
        Returns:
            List of active stream sessions
        """
        return self.session_repository.get_active_sessions()
