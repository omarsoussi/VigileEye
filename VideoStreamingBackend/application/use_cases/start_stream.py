"""Use case: Start a video stream."""
from __future__ import annotations

import logging
from datetime import datetime, timezone, timedelta
from uuid import UUID

from domain.entities.stream_session import StreamSession, StreamStatus
from domain.entities.stream_config import StreamConfig
from domain.repositories.stream_session_repository import StreamSessionRepositoryInterface

logger = logging.getLogger(__name__)

# Session is considered stale if no frames for this duration
STALE_SESSION_TIMEOUT = timedelta(minutes=2)


class StartStreamUseCase:
    """
    Use case for starting a video stream session.
    
    Creates a new stream session and prepares it for connection.
    Handles existing sessions gracefully by reusing or cleaning up stale ones.
    """

    def __init__(self, session_repository: StreamSessionRepositoryInterface):
        self.session_repository = session_repository

    def execute(
        self,
        camera_id: UUID,
        stream_url: str,
        config: StreamConfig | None = None,
        force_restart: bool = False,
    ) -> tuple[StreamSession, bool]:
        """
        Start a new stream session or reuse existing one.
        
        Args:
            camera_id: ID of the camera to stream
            stream_url: URL of the camera stream
            config: Optional stream configuration
            force_restart: If True, always create new session even if one exists
            
        Returns:
            Tuple of (stream session, is_new_session)
        """
        # Check if camera already has an active stream
        existing = self.session_repository.get_by_camera_id(camera_id)
        
        if existing:
            # Check if session is in an active state
            if existing.status in (
                StreamStatus.ACTIVE,
                StreamStatus.CONNECTING,
                StreamStatus.RECONNECTING,
            ):
                # Check if session is stale (no frames for a while)
                now = datetime.now(timezone.utc)
                last_activity = existing.last_frame_at or existing.started_at or existing.created_at
                
                # Make sure last_activity is timezone-aware
                if last_activity and last_activity.tzinfo is None:
                    last_activity = last_activity.replace(tzinfo=timezone.utc)
                
                is_stale = last_activity and (now - last_activity) > STALE_SESSION_TIMEOUT
                
                if force_restart or is_stale:
                    # Mark existing session as stopped
                    logger.info(f"Cleaning up {'stale' if is_stale else 'forced'} session for camera {camera_id}")
                    existing.stop()
                    self.session_repository.save(existing)
                else:
                    # Reuse existing active session
                    logger.info(f"Reusing existing active session for camera {camera_id}")
                    return existing, False
            elif existing.status in (StreamStatus.ERROR, StreamStatus.PENDING):
                # Clean up errored or pending sessions
                logger.info(f"Cleaning up {existing.status.value} session for camera {camera_id}")
                existing.stop()
                self.session_repository.save(existing)

        # Create new session
        fps = config.fps if config else 15
        session = StreamSession.create(
            camera_id=camera_id,
            stream_url=stream_url,
            fps=fps,
        )

        # Mark as starting
        session.start()

        # Persist
        saved = self.session_repository.save(session)
        return saved, True
