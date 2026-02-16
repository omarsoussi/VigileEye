"""Use case: Publish a video frame."""
from __future__ import annotations

from typing import Set
from uuid import UUID

from domain.entities.video_frame import VideoFrame


class PublishFrameUseCase:
    """
    Use case for broadcasting a video frame to subscribers.
    
    This is typically called by the stream reader when a new frame is available.
    """

    def __init__(self, broadcaster):
        """
        Args:
            broadcaster: StreamBroadcaster instance for WebSocket distribution
        """
        self.broadcaster = broadcaster

    async def execute(self, frame: VideoFrame) -> int:
        """
        Publish a frame to all subscribers.
        
        Args:
            frame: The video frame to broadcast
            
        Returns:
            Number of subscribers that received the frame
        """
        return await self.broadcaster.broadcast_frame(frame)
