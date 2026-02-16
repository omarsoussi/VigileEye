"""WebSocket endpoints for video streaming (Data Plane)."""
from __future__ import annotations

import asyncio
import logging
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query

from infrastructure.security.jwt_handler import jwt_handler
from infrastructure.streaming.stream_broadcaster import broadcaster
from jose import JWTError

router = APIRouter()
logger = logging.getLogger(__name__)


async def authenticate_websocket(
    websocket: WebSocket,
    token: Optional[str] = None,
) -> Optional[dict]:
    """
    Authenticate WebSocket connection.
    
    Args:
        websocket: The WebSocket connection
        token: JWT token from query parameter
        
    Returns:
        User info dict or None if authentication fails
    """
    if not token:
        # Try to get from header
        auth_header = websocket.headers.get("authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]

    if not token:
        return None

    try:
        payload = jwt_handler.verify_token(token)
        return {
            "user_id": payload.get("sub"),
            "email": payload.get("email"),
        }
    except JWTError:
        return None


@router.websocket("/stream/{camera_id}")
async def stream_websocket(
    websocket: WebSocket,
    camera_id: str,
    token: Optional[str] = Query(None),
):
    """
    WebSocket endpoint for receiving live video frames.
    
    Frames are sent as binary JPEG data.
    
    Authentication via query parameter: ?token=<jwt>
    """
    # Authenticate
    user = await authenticate_websocket(websocket, token)
    if not user:
        await websocket.close(code=4001, reason="Unauthorized")
        return

    # Accept connection
    await websocket.accept()
    logger.info(f"WebSocket connected for camera {camera_id} by user {user['email']}")

    try:
        camera_uuid = UUID(camera_id)

        # Subscribe to frames
        await broadcaster.subscribe(camera_uuid, websocket)

        # Keep connection alive
        while True:
            try:
                # Wait for client messages (ping/pong, close)
                data = await asyncio.wait_for(
                    websocket.receive_text(),
                    timeout=30.0,
                )
                # Handle ping
                if data == "ping":
                    await websocket.send_text("pong")
            except asyncio.TimeoutError:
                # Send keepalive
                try:
                    await websocket.send_text("ping")
                except Exception:
                    break

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for camera {camera_id}")
    except ValueError as e:
        logger.error(f"Invalid camera ID: {e}")
        await websocket.close(code=4000, reason="Invalid camera ID")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        # Unsubscribe
        try:
            camera_uuid = UUID(camera_id)
            await broadcaster.unsubscribe(camera_uuid, websocket)
        except Exception:
            pass


@router.websocket("/frames/{camera_id}")
async def frames_websocket(
    websocket: WebSocket,
    camera_id: str,
    token: Optional[str] = Query(None),
):
    """
    WebSocket endpoint for AI service to receive raw frames.
    
    Similar to /stream but may include additional metadata.
    """
    # Authenticate
    user = await authenticate_websocket(websocket, token)
    if not user:
        await websocket.close(code=4001, reason="Unauthorized")
        return

    await websocket.accept()
    logger.info(f"AI frames WebSocket connected for camera {camera_id}")

    try:
        camera_uuid = UUID(camera_id)
        await broadcaster.subscribe(camera_uuid, websocket)

        while True:
            try:
                data = await asyncio.wait_for(
                    websocket.receive_text(),
                    timeout=30.0,
                )
                if data == "ping":
                    await websocket.send_text("pong")
            except asyncio.TimeoutError:
                try:
                    await websocket.send_text("ping")
                except Exception:
                    break

    except WebSocketDisconnect:
        logger.info(f"AI frames WebSocket disconnected for camera {camera_id}")
    except Exception as e:
        logger.error(f"AI frames WebSocket error: {e}")
    finally:
        try:
            camera_uuid = UUID(camera_id)
            await broadcaster.unsubscribe(camera_uuid, websocket)
        except Exception:
            pass
