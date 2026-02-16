"""Stream manager for coordinating stream sessions."""
from __future__ import annotations

import asyncio
import logging
from typing import Dict, Optional, Union
from uuid import UUID

from domain.entities.stream_session import StreamSession, StreamStatus
from domain.entities.stream_config import StreamConfig
from domain.entities.video_frame import VideoFrame, FrameEncoding
from domain.repositories.stream_session_repository import StreamSessionRepositoryInterface
from infrastructure.streaming.camera_stream_reader import CameraStreamReader
from infrastructure.streaming.ffmpeg_stream_reader import FFmpegStreamReader
from infrastructure.streaming.frame_encoder import FrameEncoder
from infrastructure.streaming.stream_broadcaster import StreamBroadcaster
from infrastructure.streaming.stream_resolver import StreamResolver, StreamType

logger = logging.getLogger(__name__)

# Stream types that work better with FFmpeg reader
# - HLS: OpenCV has limited .m3u8 support
# - YouTube: Requires URL extraction via yt-dlp
# - HTTP_VIDEO: Various formats that FFmpeg handles better (incl. remote MP4)
# - RTSP: FFmpeg is more reliable for many cameras than OpenCV
# - RTMP: FFmpeg has better RTMP support
# - FILE: Local video files, FFmpeg supports looping
FFMPEG_STREAM_TYPES = {
    StreamType.HLS, 
    StreamType.YOUTUBE, 
    StreamType.HTTP_VIDEO,
    StreamType.RTSP,
    StreamType.RTMP,
    StreamType.FILE,
}


class StreamManager:
    """
    Manages active stream sessions and coordinates reading/broadcasting.
    
    This is the main orchestrator for video streaming.
    """

    def __init__(
        self,
        session_repository: StreamSessionRepositoryInterface,
        broadcaster: StreamBroadcaster,
        default_fps: int = 15,
        frame_quality: int = 85,
    ):
        self.session_repository = session_repository
        self.broadcaster = broadcaster
        self.default_fps = default_fps
        self.encoder = FrameEncoder(quality=frame_quality)

        # Active stream readers (can be CameraStreamReader or FFmpegStreamReader)
        self._readers: Dict[UUID, Union[CameraStreamReader, FFmpegStreamReader]] = {}
        self._tasks: Dict[UUID, asyncio.Task] = {}
        self._running = False

    async def start_stream(
        self,
        session: StreamSession,
        config: Optional[StreamConfig] = None,
    ) -> None:
        """
        Start streaming for a session.
        
        Automatically chooses the best reader based on stream type:
        - FFmpeg for HLS, YouTube, and complex HTTP streams
        - OpenCV for RTSP, MJPEG, and local files
        
        Args:
            session: The stream session
            config: Optional stream configuration
        """
        camera_id = session.camera_id
        stream_url = session.stream_url
        logger.info(f"start_stream called for camera {camera_id}, URL: {stream_url}")

        # Check if already streaming and task is still running
        if camera_id in self._tasks:
            task = self._tasks[camera_id]
            if not task.done():
                logger.info(f"Stream already active for camera {camera_id}")
                return
            else:
                # Task finished, clean up and restart
                logger.info(f"Previous stream task finished for camera {camera_id}, restarting")
                del self._tasks[camera_id]
                if camera_id in self._readers:
                    self._readers[camera_id].close()
                    del self._readers[camera_id]

        # Detect stream type and choose appropriate reader
        stream_type = StreamResolver.detect_stream_type(stream_url)
        logger.info(f"Detected stream type: {stream_type.value} for camera {camera_id}")
        
        # Use FFmpeg for complex streams, OpenCV for simple ones
        if stream_type in FFMPEG_STREAM_TYPES:
            logger.info(f"Using FFmpeg reader for {stream_type.value} stream")
            reader = FFmpegStreamReader(
                camera_id=camera_id,
                stream_url=stream_url,
                config=config,
            )
            use_ffmpeg = True
        else:
            logger.info(f"Using OpenCV reader for {stream_type.value} stream")
            reader = CameraStreamReader(
                camera_id=camera_id,
                stream_url=stream_url,
                config=config,
            )
            use_ffmpeg = False

        self._readers[camera_id] = reader

        # Start streaming task
        task = asyncio.create_task(
            self._stream_loop(session, reader, config, use_ffmpeg=use_ffmpeg)
        )
        self._tasks[camera_id] = task
        logger.info(f"Started stream task for camera {camera_id}")

    async def _stream_loop(
        self,
        session: StreamSession,
        reader: Union[CameraStreamReader, FFmpegStreamReader],
        config: Optional[StreamConfig] = None,
        use_ffmpeg: bool = False,
    ) -> None:
        """
        Main streaming loop for a camera.
        
        Reads frames and broadcasts them to subscribers.
        """
        camera_id = session.camera_id
        fps = config.fps if config else self.default_fps
        frame_interval = 1.0 / fps
        sequence = 0

        try:
            # Open the stream
            logger.info(f"Opening stream for camera {camera_id} (ffmpeg={use_ffmpeg})")
            
            if use_ffmpeg:
                # FFmpeg reader has async open with URL resolution
                success = await reader.open_async()
                if not success:
                    raise Exception("Failed to open FFmpeg stream")
            else:
                # OpenCV reader uses sync open
                reader.open()
            
            logger.info(f"Stream opened for camera {camera_id}")

            # Update session status
            session.activate()
            self.session_repository.update(session)

            logger.info(f"Stream active for camera {camera_id} at {fps} FPS, broadcasting...")

            while camera_id in self._tasks:
                start_time = asyncio.get_event_loop().time()

                # Read frame
                result = await reader.read_frame_async()

                if result is None:
                    # No frame available, brief pause
                    await asyncio.sleep(0.01)
                    continue

                frame_array, width, height = result

                # Encode frame
                frame_bytes = self.encoder.encode_jpeg(frame_array)

                # Create frame entity
                frame = VideoFrame.create(
                    camera_id=camera_id,
                    frame_bytes=frame_bytes,
                    width=width,
                    height=height,
                    encoding=FrameEncoding.JPEG,
                    sequence=sequence,
                    session_id=session.id,
                )

                # Broadcast to subscribers
                sent_count = await self.broadcaster.broadcast_frame(frame)
                
                if sequence % 100 == 0:
                    logger.debug(f"Camera {camera_id}: frame {sequence}, sent to {sent_count} subscribers")

                # Update session
                session.update_last_frame()
                sequence += 1

                # Throttle to target FPS
                elapsed = asyncio.get_event_loop().time() - start_time
                sleep_time = max(0, frame_interval - elapsed)
                if sleep_time > 0:
                    await asyncio.sleep(sleep_time)

        except asyncio.CancelledError:
            logger.info(f"Stream task cancelled for camera {camera_id}")
        except Exception as e:
            logger.error(f"Stream error for camera {camera_id}: {e}")
            session.mark_error(str(e))
            self.session_repository.update(session)
        finally:
            reader.close()
            self._readers.pop(camera_id, None)
            self._tasks.pop(camera_id, None)

    async def stop_stream(self, camera_id: UUID) -> None:
        """
        Stop streaming for a camera.
        
        Args:
            camera_id: ID of the camera
        """
        task = self._tasks.pop(camera_id, None)
        if task:
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass

        reader = self._readers.pop(camera_id, None)
        if reader:
            reader.close()

        # Close WebSocket connections
        await self.broadcaster.close_all(camera_id)

        logger.info(f"Stopped stream for camera {camera_id}")

    async def stop_all(self) -> None:
        """Stop all active streams."""
        camera_ids = list(self._tasks.keys())
        for camera_id in camera_ids:
            await self.stop_stream(camera_id)

    def is_streaming(self, camera_id: UUID) -> bool:
        """Check if a camera is currently streaming."""
        return camera_id in self._tasks

    def get_active_camera_ids(self) -> list:
        """Get list of cameras currently streaming."""
        return list(self._tasks.keys())
