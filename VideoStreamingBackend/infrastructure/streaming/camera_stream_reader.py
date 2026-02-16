"""Camera stream reader using OpenCV with enhanced RTSP support."""
from __future__ import annotations

import asyncio
import logging
import os
import threading
import time
from typing import Optional, Tuple
from uuid import UUID

import cv2
import numpy as np

from domain.entities.stream_config import StreamConfig
from domain.exceptions import StreamConnectionException, StreamDecodingException

logger = logging.getLogger(__name__)


class CameraStreamReader:
    """
    Reads video frames from a camera stream (RTSP/HTTP/File).
    
    Uses OpenCV for video capture with enhanced RTSP handling.
    Supports RTSP, HTTP/MJPEG, HLS, and local video files.
    """

    def __init__(
        self,
        camera_id: UUID,
        stream_url: str,
        config: Optional[StreamConfig] = None,
    ):
        self.camera_id = camera_id
        self.stream_url = stream_url
        self.config = config or StreamConfig()
        self._capture: Optional[cv2.VideoCapture] = None
        self._is_open = False
        self._frame_count = 0
        self._consecutive_failures = 0
        self._max_failures = 30  # More tolerance for network streams
        self._is_file = False
        self._total_frames = 0
        self._last_frame: Optional[np.ndarray] = None
        self._lock = threading.Lock()

    @property
    def is_open(self) -> bool:
        """Check if the stream is open."""
        return self._is_open and self._capture is not None and self._capture.isOpened()

    def _detect_stream_type(self, url: str) -> str:
        """Detect the type of stream from URL."""
        url_lower = url.lower()
        if url_lower.startswith("rtsp://"):
            return "rtsp"
        elif url_lower.startswith("rtmp://"):
            return "rtmp"
        elif url_lower.endswith(".m3u8") or "hls" in url_lower:
            return "hls"
        elif url_lower.endswith(".mjpg") or url_lower.endswith(".mjpeg") or "mjpg" in url_lower:
            return "mjpeg"
        elif url_lower.startswith("http://") or url_lower.startswith("https://"):
            return "http"
        elif url_lower.startswith("/") or url_lower.startswith("file://") or (len(url) > 2 and url[1] == ":"):
            return "file"
        else:
            return "unknown"

    def _configure_rtsp_environment(self) -> None:
        """Configure environment for RTSP streams."""
        # TCP transport is more reliable than UDP for RTSP
        # Longer timeout for initial connection in seconds
        os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = (
            "rtsp_transport;tcp|"
            "stimeout;30000000|"  # 30 second timeout
            "max_delay;500000|"
            "reorder_queue_size;0"
        )

    def _try_open_stream(self, url: str, backend: int = cv2.CAP_FFMPEG) -> bool:
        """Try to open a stream with given backend."""
        try:
            if self._capture is not None:
                self._capture.release()
            
            self._capture = cv2.VideoCapture(url, backend)
            
            # Configure capture properties
            self._capture.set(cv2.CAP_PROP_BUFFERSIZE, 3)
            
            # For RTSP, set longer timeouts
            stream_type = self._detect_stream_type(url)
            if stream_type == "rtsp":
                self._capture.set(cv2.CAP_PROP_OPEN_TIMEOUT_MSEC, 30000)
                self._capture.set(cv2.CAP_PROP_READ_TIMEOUT_MSEC, 15000)
        
            return self._capture.isOpened()
        except Exception as e:
            logger.error(f"Error opening stream with backend {backend}: {e}")
            return False

    def open(self) -> bool:
        """
        Open the camera stream with multiple fallback strategies.
        
        Returns:
            True if successful
            
        Raises:
            StreamConnectionException: If unable to connect
        """
        stream_url = self.stream_url
        stream_type = self._detect_stream_type(stream_url)
        
        logger.info(f"Opening {stream_type} stream: {stream_url}")
        
        self._is_file = stream_type == "file"
        
        try:
            # Configure environment for RTSP
            if stream_type == "rtsp":
                self._configure_rtsp_environment()
            
            # Strategy 1: Try with FFMPEG backend (best for network streams)
            if self._try_open_stream(stream_url, cv2.CAP_FFMPEG):
                logger.info("Opened with FFMPEG backend")
            # Strategy 2: Try with default backend
            elif self._try_open_stream(stream_url, cv2.CAP_ANY):
                logger.info("Opened with default backend")
            # Strategy 3: For RTSP, try with GStreamer if available
            elif stream_type == "rtsp":
                gst_pipeline = self._build_gstreamer_pipeline(stream_url)
                if gst_pipeline and self._try_open_stream(gst_pipeline, cv2.CAP_GSTREAMER):
                    logger.info("Opened with GStreamer backend")
                else:
                    raise StreamConnectionException(f"Failed to open RTSP stream: {stream_url}")
            else:
                raise StreamConnectionException(f"Failed to open stream: {stream_url}")
            
            # Get video properties
            if self._is_file:
                self._total_frames = int(self._capture.get(cv2.CAP_PROP_FRAME_COUNT))
                logger.info(f"Video file with {self._total_frames} frames")
            
            # Verify stream by reading a test frame
            # Give RTSP streams more time to initialize
            max_retries = 10 if stream_type == "rtsp" else 3
            for attempt in range(max_retries):
                ret, test_frame = self._capture.read()
                if ret and test_frame is not None:
                    logger.info(f"Stream verified, frame shape: {test_frame.shape}")
                    self._last_frame = test_frame
                    # Reset file position
                    if self._is_file:
                        self._capture.set(cv2.CAP_PROP_POS_FRAMES, 0)
                    break
                else:
                    logger.warning(f"Frame read attempt {attempt + 1}/{max_retries} failed")
                    time.sleep(0.5)
            else:
                # Even if test frame fails, keep trying - some streams are slow
                logger.warning(f"Could not read test frame, but keeping stream open")
            
            self._is_open = True
            self._frame_count = 0
            self._consecutive_failures = 0
            logger.info(f"Successfully opened stream for camera {self.camera_id}")
            return True
            
        except StreamConnectionException:
            raise
        except Exception as e:
            logger.error(f"Error opening stream {stream_url}: {e}")
            raise StreamConnectionException(str(e))

    def _build_gstreamer_pipeline(self, rtsp_url: str) -> Optional[str]:
        """Build a GStreamer pipeline for RTSP streams."""
        try:
            # Check if GStreamer is available
            test_cap = cv2.VideoCapture("videotestsrc ! videoconvert ! appsink", cv2.CAP_GSTREAMER)
            if test_cap.isOpened():
                test_cap.release()
                # Build RTSP pipeline
                pipeline = (
                    f"rtspsrc location={rtsp_url} latency=0 ! "
                    "rtph264depay ! h264parse ! avdec_h264 ! "
                    "videoconvert ! appsink"
                )
                return pipeline
        except Exception:
            pass
        return None

    def read_frame(self) -> Optional[Tuple[np.ndarray, int, int]]:
        """
        Read a single frame from the stream.
        
        For video files, automatically loops when reaching the end.
        
        Returns:
            Tuple of (frame_array, width, height) or None if no frame available
            
        Raises:
            StreamDecodingException: If unable to decode frame after max retries
        """
        if not self.is_open:
            return None

        with self._lock:
            try:
                ret, frame = self._capture.read()
                
                # Handle video file looping
                if (not ret or frame is None) and self._is_file and self._total_frames > 0:
                    self._capture.set(cv2.CAP_PROP_POS_FRAMES, 0)
                    ret, frame = self._capture.read()
                    logger.debug(f"Looped video file for camera {self.camera_id}")
                
                if not ret or frame is None:
                    self._consecutive_failures += 1
                    
                    # Return last good frame if available (prevents black screen)
                    if self._last_frame is not None and self._consecutive_failures < self._max_failures:
                        height, width = self._last_frame.shape[:2]
                        return self._last_frame.copy(), width, height
                    
                    if self._consecutive_failures >= self._max_failures:
                        logger.error(f"Too many frame failures ({self._consecutive_failures})")
                        raise StreamDecodingException(
                            f"Failed to read frames after {self._consecutive_failures} attempts"
                        )
                    return None

                # Success - reset failure counter
                self._consecutive_failures = 0
                self._last_frame = frame.copy()
                
                height, width = frame.shape[:2]

                # Resize if configured
                if self.config.width or self.config.height:
                    target_width = self.config.width or width
                    target_height = self.config.height or height
                    frame = cv2.resize(frame, (target_width, target_height))
                    width, height = target_width, target_height

                self._frame_count += 1
                return frame, width, height

            except StreamDecodingException:
                raise
            except Exception as e:
                logger.error(f"Error reading frame: {e}")
                self._consecutive_failures += 1
                if self._consecutive_failures >= self._max_failures:
                    raise StreamDecodingException(str(e))
                return None

    async def read_frame_async(self) -> Optional[Tuple[np.ndarray, int, int]]:
        """Read a frame asynchronously."""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self.read_frame)

    def close(self) -> None:
        """Close the stream."""
        with self._lock:
            if self._capture is not None:
                self._capture.release()
                self._capture = None
            self._is_open = False
            self._last_frame = None
            logger.info(f"Closed stream for camera {self.camera_id}")

    def get_info(self) -> dict:
        """Get stream information."""
        if not self.is_open:
            return {}
        
        return {
            "fps": self._capture.get(cv2.CAP_PROP_FPS),
            "width": int(self._capture.get(cv2.CAP_PROP_FRAME_WIDTH)),
            "height": int(self._capture.get(cv2.CAP_PROP_FRAME_HEIGHT)),
            "frame_count": self._frame_count,
            "is_file": self._is_file,
            "total_frames": self._total_frames if self._is_file else None,
        }

    def __enter__(self):
        self.open()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()
        return False
