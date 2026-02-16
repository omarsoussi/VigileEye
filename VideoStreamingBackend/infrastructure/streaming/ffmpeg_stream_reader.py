"""FFmpeg-based stream reader for HLS, YouTube, and other complex streams."""
from __future__ import annotations

import asyncio
import logging
import subprocess
import threading
import time
from queue import Queue, Empty
from typing import Optional, Tuple
from uuid import UUID

import cv2
import numpy as np

from domain.entities.stream_config import StreamConfig
from infrastructure.streaming.stream_resolver import StreamResolver, StreamType

logger = logging.getLogger(__name__)


class FFmpegStreamReader:
    """
    Reads video frames using FFmpeg subprocess.
    
    More reliable than OpenCV for:
    - HLS streams (.m3u8)
    - YouTube and other web videos
    - Complex HTTP streams
    """

    def __init__(
        self,
        camera_id: UUID,
        stream_url: str,
        config: Optional[StreamConfig] = None,
    ):
        self.camera_id = camera_id
        self.original_url = stream_url
        self.resolved_url = stream_url
        self.config = config or StreamConfig()
        
        self._process: Optional[subprocess.Popen] = None
        self._is_open = False
        self._frame_queue: Queue = Queue(maxsize=30)
        self._reader_thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()
        
        self._width = 640
        self._height = 480
        self._frame_count = 0
        self._last_frame: Optional[np.ndarray] = None
        self._stream_type: StreamType = StreamType.UNKNOWN

    @property
    def is_open(self) -> bool:
        return self._is_open and self._process is not None and self._process.poll() is None

    async def open_async(self) -> bool:
        """Open the stream asynchronously (resolves URL first)."""
        try:
            # Resolve the URL
            self.resolved_url, self._stream_type, error = await StreamResolver.resolve(self.original_url)
            
            if error:
                logger.warning(f"URL resolution warning: {error}")
            
            logger.info(f"Opening stream for camera {self.camera_id}")
            logger.info(f"  Original URL: {self.original_url}")
            logger.info(f"  Resolved URL: {self.resolved_url[:100]}...")
            logger.info(f"  Stream type: {self._stream_type.value}")
            
            # Open in a thread pool
            return await asyncio.to_thread(self.open)
            
        except Exception as e:
            logger.error(f"Error opening stream: {e}")
            return False

    def open(self) -> bool:
        """Open the FFmpeg stream."""
        try:
            # Determine output resolution
            target_width = self.config.width or 640
            target_height = self.config.height or 480
            
            # Build FFmpeg command
            cmd = self._build_ffmpeg_command(target_width, target_height)
            
            logger.info(f"Starting FFmpeg: {' '.join(cmd[:10])}...")
            
            self._process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                bufsize=10**8
            )
            
            # Wait a moment for FFmpeg to start
            time.sleep(0.5)
            
            # Check if process started successfully
            if self._process.poll() is not None:
                stderr = self._process.stderr.read().decode() if self._process.stderr else ""
                logger.error(f"FFmpeg failed to start: {stderr[:500]}")
                return False
            
            self._width = target_width
            self._height = target_height
            self._is_open = True
            
            # Start reader thread
            self._stop_event.clear()
            self._reader_thread = threading.Thread(target=self._read_frames_loop, daemon=True)
            self._reader_thread.start()
            
            logger.info(f"FFmpeg stream opened for camera {self.camera_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error opening FFmpeg stream: {e}")
            self.close()
            return False

    def _build_ffmpeg_command(self, width: int, height: int) -> list:
        """Build the FFmpeg command based on stream type."""
        
        # Base input options
        input_options = [
            '-y',  # Overwrite output
            '-loglevel', 'error',  # Reduce log verbosity
        ]
        
        # Stream-type specific options
        if self._stream_type == StreamType.RTSP:
            input_options.extend([
                '-rtsp_transport', 'tcp',
                '-stimeout', '5000000',  # 5 second timeout
            ])
        elif self._stream_type == StreamType.RTMP:
            input_options.extend([
                '-live_start_index', '-1',
            ])
        elif self._stream_type in (StreamType.HLS, StreamType.YOUTUBE):
            input_options.extend([
                '-reconnect', '1',
                '-reconnect_streamed', '1',
                '-reconnect_delay_max', '5',
            ])
        elif self._stream_type == StreamType.HTTP_VIDEO:
            # For remote video files, loop indefinitely
            input_options.extend([
                '-stream_loop', '-1',  # Loop forever
                '-reconnect', '1',
                '-reconnect_at_eof', '1',
                '-reconnect_streamed', '1',
            ])
        elif self._stream_type == StreamType.FILE:
            # For local video files, also loop
            input_options.extend([
                '-stream_loop', '-1',  # Loop forever
            ])
        
        # Common input options
        input_options.extend([
            '-i', self.resolved_url,
        ])
        
        # Output options
        output_options = [
            '-f', 'rawvideo',
            '-pix_fmt', 'bgr24',
            '-s', f'{width}x{height}',
            '-r', str(self.config.fps or 15),
            '-an',  # No audio
            'pipe:1'  # Output to stdout
        ]
        
        return ['ffmpeg'] + input_options + output_options

    def _read_frames_loop(self):
        """Background thread to read frames from FFmpeg."""
        frame_size = self._width * self._height * 3  # BGR = 3 bytes per pixel
        
        while not self._stop_event.is_set() and self._process and self._process.poll() is None:
            try:
                raw_frame = self._process.stdout.read(frame_size)
                
                if len(raw_frame) != frame_size:
                    if len(raw_frame) == 0:
                        logger.debug("FFmpeg stream ended")
                        break
                    continue
                
                # Convert to numpy array
                frame = np.frombuffer(raw_frame, dtype=np.uint8).reshape((self._height, self._width, 3))
                
                # Put in queue (drop old frames if full)
                try:
                    if self._frame_queue.full():
                        try:
                            self._frame_queue.get_nowait()
                        except Empty:
                            pass
                    self._frame_queue.put_nowait(frame)
                except:
                    pass
                    
            except Exception as e:
                if not self._stop_event.is_set():
                    logger.error(f"Error reading frame: {e}")
                break
        
        logger.info(f"Frame reader loop ended for camera {self.camera_id}")

    def read_frame(self) -> Optional[Tuple[np.ndarray, int, int]]:
        """Read a frame from the queue."""
        if not self.is_open:
            return None
        
        try:
            frame = self._frame_queue.get(timeout=0.1)
            self._last_frame = frame.copy()
            self._frame_count += 1
            return frame, self._width, self._height
        except Empty:
            # Return last frame if available
            if self._last_frame is not None:
                return self._last_frame.copy(), self._width, self._height
            return None

    async def read_frame_async(self) -> Optional[Tuple[np.ndarray, int, int]]:
        """Read a frame asynchronously."""
        return await asyncio.to_thread(self.read_frame)

    def close(self):
        """Close the stream and cleanup."""
        self._stop_event.set()
        self._is_open = False
        
        if self._process:
            try:
                self._process.terminate()
                self._process.wait(timeout=2)
            except:
                try:
                    self._process.kill()
                except:
                    pass
            self._process = None
        
        if self._reader_thread:
            self._reader_thread.join(timeout=2)
            self._reader_thread = None
        
        # Clear queue
        while not self._frame_queue.empty():
            try:
                self._frame_queue.get_nowait()
            except:
                break
        
        self._last_frame = None
        logger.info(f"Closed FFmpeg stream for camera {self.camera_id}")

    def get_info(self) -> dict:
        """Get stream information."""
        return {
            "width": self._width,
            "height": self._height,
            "fps": self.config.fps or 15,
            "frame_count": self._frame_count,
            "stream_type": self._stream_type.value,
            "original_url": self.original_url,
            "is_open": self.is_open,
        }

    def __enter__(self):
        self.open()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()
        return False
