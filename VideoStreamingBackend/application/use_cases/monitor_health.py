"""Use case: Monitor stream health."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Tuple

from domain.entities.stream_session import StreamSession, StreamStatus
from domain.repositories.stream_session_repository import StreamSessionRepositoryInterface


class MonitorHealthUseCase:
    """
    Use case for monitoring stream health and detecting failures.
    """

    def __init__(
        self,
        session_repository: StreamSessionRepositoryInterface,
        timeout_seconds: int = 30,
    ):
        self.session_repository = session_repository
        self.timeout_seconds = timeout_seconds

    def execute(self) -> List[Tuple[StreamSession, str]]:
        """
        Check all active streams for health issues.
        
        Returns:
            List of (session, issue_description) tuples for unhealthy streams
        """
        issues: List[Tuple[StreamSession, str]] = []
        active_sessions = self.session_repository.get_active_sessions()

        now = datetime.now(timezone.utc)
        for session in active_sessions:
            if not session.is_alive(self.timeout_seconds):
                if session.last_frame_at:
                    elapsed = (now - session.last_frame_at).total_seconds()
                    issues.append((
                        session,
                        f"No frames received for {elapsed:.1f} seconds"
                    ))
                else:
                    issues.append((
                        session,
                        "Stream connected but no frames received"
                    ))

        return issues
