"""Stream broadcaster for WebSocket distribution."""
from __future__ import annotations

import asyncio
import logging
from typing import Dict, Set
from uuid import UUID

from fastapi import WebSocket

from domain.entities.video_frame import VideoFrame

logger = logging.getLogger(__name__)


class StreamBroadcaster:
    """
    Manages WebSocket connections and broadcasts frames to subscribers.
    
    Each camera can have multiple subscribers (frontend clients, AI service).
    """

    def __init__(self):
        # camera_id -> set of WebSocket connections
        self._subscribers: Dict[UUID, Set[WebSocket]] = {}
        self._lock = asyncio.Lock()

    async def subscribe(self, camera_id: UUID, websocket: WebSocket) -> None:
        """
        Subscribe a WebSocket to receive frames from a camera.
        
        Args:
            camera_id: ID of the camera
            websocket: WebSocket connection
        """
        async with self._lock:
            if camera_id not in self._subscribers:
                self._subscribers[camera_id] = set()
            self._subscribers[camera_id].add(websocket)
            logger.info(f"Subscriber added for camera {camera_id}. Total: {len(self._subscribers[camera_id])}")

    async def unsubscribe(self, camera_id: UUID, websocket: WebSocket) -> None:
        """
        Unsubscribe a WebSocket from a camera's frames.
        
        Args:
            camera_id: ID of the camera
            websocket: WebSocket connection
        """
        async with self._lock:
            if camera_id in self._subscribers:
                self._subscribers[camera_id].discard(websocket)
                if not self._subscribers[camera_id]:
                    del self._subscribers[camera_id]
                logger.info(f"Subscriber removed for camera {camera_id}")

    async def broadcast_frame(self, frame: VideoFrame) -> int:
        """
        Broadcast a frame to all subscribers of the camera.
        
        Args:
            frame: The video frame to broadcast
            
        Returns:
            Number of subscribers that received the frame
        """
        camera_id = frame.camera_id
        subscribers = self._subscribers.get(camera_id, set())

        if not subscribers:
            return 0

        # Prepare frame data
        frame_data = frame.frame_bytes
        disconnected: Set[WebSocket] = set()
        sent_count = 0

        for ws in subscribers.copy():
            try:
                await ws.send_bytes(frame_data)
                sent_count += 1
            except Exception as e:
                logger.warning(f"Failed to send frame to subscriber: {e}")
                disconnected.add(ws)

        # Clean up disconnected subscribers
        if disconnected:
            async with self._lock:
                if camera_id in self._subscribers:
                    self._subscribers[camera_id] -= disconnected

        return sent_count

    async def broadcast_json(self, camera_id: UUID, data: dict) -> int:
        """
        Broadcast JSON data to all subscribers of a camera.
        
        Args:
            camera_id: ID of the camera
            data: JSON-serializable data
            
        Returns:
            Number of subscribers that received the data
        """
        subscribers = self._subscribers.get(camera_id, set())
        
        if not subscribers:
            return 0

        disconnected: Set[WebSocket] = set()
        sent_count = 0

        for ws in subscribers.copy():
            try:
                await ws.send_json(data)
                sent_count += 1
            except Exception as e:
                logger.warning(f"Failed to send JSON to subscriber: {e}")
                disconnected.add(ws)

        # Clean up disconnected subscribers
        if disconnected:
            async with self._lock:
                if camera_id in self._subscribers:
                    self._subscribers[camera_id] -= disconnected

        return sent_count

    def get_subscriber_count(self, camera_id: UUID) -> int:
        """Get the number of subscribers for a camera."""
        return len(self._subscribers.get(camera_id, set()))

    def get_all_camera_ids(self) -> Set[UUID]:
        """Get all camera IDs with active subscribers."""
        return set(self._subscribers.keys())

    async def close_all(self, camera_id: UUID) -> None:
        """
        Close all connections for a camera.
        
        Args:
            camera_id: ID of the camera
        """
        async with self._lock:
            subscribers = self._subscribers.pop(camera_id, set())

        for ws in subscribers:
            try:
                await ws.close()
            except Exception:
                pass


# Global broadcaster instance
broadcaster = StreamBroadcaster()
