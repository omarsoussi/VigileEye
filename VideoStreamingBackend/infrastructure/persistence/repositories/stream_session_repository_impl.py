"""SQLAlchemy implementation of StreamSessionRepository."""
from __future__ import annotations

from typing import List, Optional
from uuid import UUID

from sqlalchemy.orm import Session

from domain.entities.stream_session import StreamSession, StreamStatus
from domain.repositories.stream_session_repository import StreamSessionRepositoryInterface
from infrastructure.persistence.models.stream_session_model import StreamSessionModel


class SQLAlchemyStreamSessionRepository(StreamSessionRepositoryInterface):
    """SQLAlchemy implementation of stream session repository."""

    def __init__(self, db: Session):
        self.db = db

    def _to_entity(self, model: StreamSessionModel) -> StreamSession:
        """Convert model to domain entity."""
        # Convert string status from DB to StreamStatus enum
        status = StreamStatus(model.status) if isinstance(model.status, str) else model.status
        return StreamSession(
            id=model.id,
            camera_id=model.camera_id,
            stream_url=model.stream_url,
            status=status,
            fps=model.fps,
            started_at=model.started_at,
            last_frame_at=model.last_frame_at,
            stopped_at=model.stopped_at,
            error_message=model.error_message,
            reconnect_attempts=model.reconnect_attempts,
            created_at=model.created_at,
            updated_at=model.updated_at,
        )

    def _to_model(self, entity: StreamSession) -> StreamSessionModel:
        """Convert domain entity to model."""
        # Convert StreamStatus enum to string value for DB
        status_value = entity.status.value if isinstance(entity.status, StreamStatus) else entity.status
        return StreamSessionModel(
            id=entity.id,
            camera_id=entity.camera_id,
            stream_url=entity.stream_url,
            status=status_value,
            fps=entity.fps,
            started_at=entity.started_at,
            last_frame_at=entity.last_frame_at,
            stopped_at=entity.stopped_at,
            error_message=entity.error_message,
            reconnect_attempts=entity.reconnect_attempts,
            created_at=entity.created_at,
            updated_at=entity.updated_at,
        )

    def save(self, session: StreamSession) -> StreamSession:
        """Save or update a stream session."""
        # Check if session already exists
        existing = self.db.query(StreamSessionModel).filter(
            StreamSessionModel.id == session.id
        ).first()
        
        if existing:
            # Update existing session
            status_value = session.status.value if isinstance(session.status, StreamStatus) else session.status
            existing.stream_url = session.stream_url
            existing.status = status_value
            existing.fps = session.fps
            existing.started_at = session.started_at
            existing.last_frame_at = session.last_frame_at
            existing.stopped_at = session.stopped_at
            existing.error_message = session.error_message
            existing.reconnect_attempts = session.reconnect_attempts
            existing.updated_at = session.updated_at
            self.db.commit()
            self.db.refresh(existing)
            return self._to_entity(existing)
        else:
            # Insert new session
            model = self._to_model(session)
            self.db.add(model)
            self.db.commit()
            self.db.refresh(model)
            return self._to_entity(model)

    def get_by_id(self, session_id: UUID) -> Optional[StreamSession]:
        """Get session by ID."""
        model = self.db.query(StreamSessionModel).filter(
            StreamSessionModel.id == session_id
        ).first()
        return self._to_entity(model) if model else None

    def get_by_camera_id(self, camera_id: UUID) -> Optional[StreamSession]:
        """Get the most recent session for a camera (active first)."""
        # First try to find an active session - use string values for DB query
        active_statuses = [
            StreamStatus.ACTIVE.value,
            StreamStatus.CONNECTING.value,
            StreamStatus.RECONNECTING.value,
            StreamStatus.PENDING.value,
        ]
        model = self.db.query(StreamSessionModel).filter(
            StreamSessionModel.camera_id == camera_id,
            StreamSessionModel.status.in_(active_statuses),
        ).order_by(StreamSessionModel.created_at.desc()).first()

        if model:
            return self._to_entity(model)

        # Otherwise get the most recent session
        model = self.db.query(StreamSessionModel).filter(
            StreamSessionModel.camera_id == camera_id
        ).order_by(StreamSessionModel.created_at.desc()).first()

        return self._to_entity(model) if model else None

    def get_active_sessions(self) -> List[StreamSession]:
        """Get all active stream sessions."""
        active_statuses = [
            StreamStatus.ACTIVE.value,
            StreamStatus.CONNECTING.value,
            StreamStatus.RECONNECTING.value,
        ]
        models = self.db.query(StreamSessionModel).filter(
            StreamSessionModel.status.in_(active_statuses)
        ).all()
        return [self._to_entity(m) for m in models]

    def get_by_status(self, status: StreamStatus) -> List[StreamSession]:
        """Get sessions by status."""
        models = self.db.query(StreamSessionModel).filter(
            StreamSessionModel.status == status.value
        ).all()
        return [self._to_entity(m) for m in models]

    def update(self, session: StreamSession) -> StreamSession:
        """Update an existing session."""
        model = self.db.query(StreamSessionModel).filter(
            StreamSessionModel.id == session.id
        ).first()
        if model:
            # Convert enum to string value for DB
            model.status = session.status.value if isinstance(session.status, StreamStatus) else session.status
            model.fps = session.fps
            model.started_at = session.started_at
            model.last_frame_at = session.last_frame_at
            model.stopped_at = session.stopped_at
            model.error_message = session.error_message
            model.reconnect_attempts = session.reconnect_attempts
            model.updated_at = session.updated_at
            self.db.commit()
            self.db.refresh(model)
            return self._to_entity(model)
        return session

    def delete(self, session_id: UUID) -> None:
        """Delete a session."""
        self.db.query(StreamSessionModel).filter(
            StreamSessionModel.id == session_id
        ).delete()
        self.db.commit()
