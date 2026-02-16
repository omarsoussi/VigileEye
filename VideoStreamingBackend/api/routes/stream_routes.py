"""Stream API Routes (Control Plane)."""
from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from api.dependencies import get_current_user
from application.dtos.stream_requests import StartStreamRequest, StopStreamRequest
from application.dtos.stream_responses import (
    StreamSessionResponse,
    StreamStatusResponse,
    ActiveStreamsResponse,
    MessageResponse,
)
from application.use_cases.start_stream import StartStreamUseCase
from application.use_cases.stop_stream import StopStreamUseCase
from application.use_cases.get_stream_status import GetStreamStatusUseCase
from application.use_cases.list_active_streams import ListActiveStreamsUseCase
from domain.entities.stream_config import StreamConfig
from domain.exceptions import (
    StreamNotFoundException,
    StreamConnectionException,
)
from infrastructure.persistence.database import get_db
from infrastructure.persistence.repositories import SQLAlchemyStreamSessionRepository
from infrastructure.streaming.stream_broadcaster import broadcaster
from infrastructure.streaming.stream_manager import StreamManager
from infrastructure.config.settings import get_settings

router = APIRouter()
settings = get_settings()

# Global stream manager (initialized on first request)
_stream_manager: StreamManager | None = None


def get_stream_manager(db: Session = Depends(get_db)) -> StreamManager:
    """Get or create the stream manager."""
    global _stream_manager
    if _stream_manager is None:
        repo = SQLAlchemyStreamSessionRepository(db)
        _stream_manager = StreamManager(
            session_repository=repo,
            broadcaster=broadcaster,
            default_fps=settings.default_fps,
            frame_quality=settings.frame_quality,
        )
    return _stream_manager


def get_session_repo(db: Session = Depends(get_db)) -> SQLAlchemyStreamSessionRepository:
    """Get session repository."""
    return SQLAlchemyStreamSessionRepository(db)


@router.post(
    "/start",
    response_model=StreamSessionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Start a video stream",
)
async def start_stream(
    request: StartStreamRequest,
    current_user: dict = Depends(get_current_user),
    repo: SQLAlchemyStreamSessionRepository = Depends(get_session_repo),
    manager: StreamManager = Depends(get_stream_manager),
):
    """
    Start streaming from a camera.
    
    Requires authentication. Creates a new stream session and begins
    reading frames from the camera URL.
    """
    try:
        camera_id = UUID(request.camera_id)

        # Create stream config if provided
        config = None
        if request.config:
            config = StreamConfig(
                fps=request.config.fps,
                quality=request.config.quality,
                width=request.config.width,
                height=request.config.height,
            )

        # Start stream
        use_case = StartStreamUseCase(repo)
        session, is_new = use_case.execute(
            camera_id=camera_id,
            stream_url=request.stream_url,
            config=config,
            force_restart=getattr(request, 'force_restart', False),
        )

        # Always try to start streaming - manager handles duplicates
        await manager.start_stream(session, config)

        return StreamSessionResponse(
            id=str(session.id),
            camera_id=str(session.camera_id),
            status=session.status.value,
            fps=session.fps,
            started_at=session.started_at,
            last_frame_at=session.last_frame_at,
            error_message=session.error_message,
            reconnect_attempts=session.reconnect_attempts,
            created_at=session.created_at,
            updated_at=session.updated_at,
        )

    except StreamConnectionException as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post(
    "/stop",
    response_model=StreamSessionResponse,
    summary="Stop a video stream",
)
async def stop_stream(
    request: StopStreamRequest,
    current_user: dict = Depends(get_current_user),
    repo: SQLAlchemyStreamSessionRepository = Depends(get_session_repo),
    manager: StreamManager = Depends(get_stream_manager),
):
    """
    Stop streaming from a camera.
    
    Terminates the stream session and closes all WebSocket connections.
    """
    try:
        camera_id = UUID(request.camera_id)

        # Stop the stream manager
        await manager.stop_stream(camera_id)

        # Update session in database
        use_case = StopStreamUseCase(repo)
        session = use_case.execute(camera_id)

        return StreamSessionResponse(
            id=str(session.id),
            camera_id=str(session.camera_id),
            status=session.status.value,
            fps=session.fps,
            started_at=session.started_at,
            last_frame_at=session.last_frame_at,
            stopped_at=session.stopped_at,
            error_message=session.error_message,
            reconnect_attempts=session.reconnect_attempts,
            created_at=session.created_at,
            updated_at=session.updated_at,
        )

    except StreamNotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get(
    "/status/{camera_id}",
    response_model=StreamStatusResponse,
    summary="Get stream status for a camera",
)
async def get_stream_status(
    camera_id: str,
    current_user: dict = Depends(get_current_user),
    repo: SQLAlchemyStreamSessionRepository = Depends(get_session_repo),
):
    """
    Get the streaming status for a camera.
    
    Returns whether the camera is currently streaming and session details.
    """
    try:
        camera_uuid = UUID(camera_id)
        use_case = GetStreamStatusUseCase(repo)
        is_streaming, session = use_case.execute(camera_uuid)

        session_response = None
        if session:
            session_response = StreamSessionResponse(
                id=str(session.id),
                camera_id=str(session.camera_id),
                status=session.status.value,
                fps=session.fps,
                started_at=session.started_at,
                last_frame_at=session.last_frame_at,
                stopped_at=session.stopped_at,
                error_message=session.error_message,
                reconnect_attempts=session.reconnect_attempts,
                created_at=session.created_at,
                updated_at=session.updated_at,
            )

        websocket_url = f"/ws/stream/{camera_id}" if is_streaming else None

        return StreamStatusResponse(
            camera_id=camera_id,
            is_streaming=is_streaming,
            status=session.status.value if session else "none",
            session=session_response,
            websocket_url=websocket_url,
        )

    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get(
    "/active",
    response_model=ActiveStreamsResponse,
    summary="List all active streams",
)
async def list_active_streams(
    current_user: dict = Depends(get_current_user),
    repo: SQLAlchemyStreamSessionRepository = Depends(get_session_repo),
):
    """
    Get all currently active stream sessions.
    """
    use_case = ListActiveStreamsUseCase(repo)
    sessions = use_case.execute()

    return ActiveStreamsResponse(
        count=len(sessions),
        streams=[
            StreamSessionResponse(
                id=str(s.id),
                camera_id=str(s.camera_id),
                status=s.status.value,
                fps=s.fps,
                started_at=s.started_at,
                last_frame_at=s.last_frame_at,
                stopped_at=s.stopped_at,
                error_message=s.error_message,
                reconnect_attempts=s.reconnect_attempts,
                created_at=s.created_at,
                updated_at=s.updated_at,
            )
            for s in sessions
        ],
    )
