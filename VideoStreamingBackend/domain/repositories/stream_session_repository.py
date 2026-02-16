"""Abstract repository interface for StreamSession."""
from abc import ABC, abstractmethod
from typing import List, Optional
from uuid import UUID

from domain.entities.stream_session import StreamSession, StreamStatus


class StreamSessionRepositoryInterface(ABC):
    """Interface for stream session persistence."""

    @abstractmethod
    def save(self, session: StreamSession) -> StreamSession:
        """Save a stream session."""
        pass

    @abstractmethod
    def get_by_id(self, session_id: UUID) -> Optional[StreamSession]:
        """Get a session by ID."""
        pass

    @abstractmethod
    def get_by_camera_id(self, camera_id: UUID) -> Optional[StreamSession]:
        """Get the active session for a camera."""
        pass

    @abstractmethod
    def get_active_sessions(self) -> List[StreamSession]:
        """Get all active stream sessions."""
        pass

    @abstractmethod
    def get_by_status(self, status: StreamStatus) -> List[StreamSession]:
        """Get sessions by status."""
        pass

    @abstractmethod
    def update(self, session: StreamSession) -> StreamSession:
        """Update a stream session."""
        pass

    @abstractmethod
    def delete(self, session_id: UUID) -> None:
        """Delete a stream session."""
        pass
