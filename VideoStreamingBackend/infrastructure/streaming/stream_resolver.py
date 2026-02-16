"""Universal stream URL resolver for various video sources."""
from __future__ import annotations

import asyncio
import logging
import re
import subprocess
from enum import Enum
from typing import Optional, Tuple
from urllib.parse import urlparse

logger = logging.getLogger(__name__)


class StreamType(Enum):
    """Types of video streams."""
    RTSP = "rtsp"
    RTMP = "rtmp"
    HLS = "hls"
    MJPEG = "mjpeg"
    HTTP_VIDEO = "http_video"
    YOUTUBE = "youtube"
    FILE = "file"
    WEBCAM = "webcam"
    UNKNOWN = "unknown"


class StreamResolver:
    """
    Resolves various video URLs to playable stream URLs.
    
    Supports:
    - RTSP streams (direct passthrough)
    - RTMP streams (direct passthrough)
    - HLS (.m3u8) streams
    - YouTube URLs (extracts actual stream)
    - MJPEG streams
    - Direct video files
    - Webcam indices
    """

    # YouTube URL patterns
    YOUTUBE_PATTERNS = [
        r'(?:https?://)?(?:www\.)?youtube\.com/watch\?v=([a-zA-Z0-9_-]+)',
        r'(?:https?://)?(?:www\.)?youtu\.be/([a-zA-Z0-9_-]+)',
        r'(?:https?://)?(?:www\.)?youtube\.com/live/([a-zA-Z0-9_-]+)',
        r'(?:https?://)?(?:www\.)?youtube\.com/embed/([a-zA-Z0-9_-]+)',
    ]

    @classmethod
    def detect_stream_type(cls, url: str) -> StreamType:
        """Detect the type of stream from the URL."""
        if not url:
            return StreamType.UNKNOWN
            
        url_lower = url.lower().strip()
        
        # Check for webcam index
        if url_lower.isdigit():
            return StreamType.WEBCAM
            
        # Check for file path
        if url_lower.startswith('/') or url_lower.startswith('file://'):
            return StreamType.FILE
        if len(url) > 2 and url[1] == ':':  # Windows path
            return StreamType.FILE
            
        # Check protocol-based streams
        if url_lower.startswith('rtsp://'):
            return StreamType.RTSP
        if url_lower.startswith('rtmp://'):
            return StreamType.RTMP
            
        # Check for YouTube URLs
        for pattern in cls.YOUTUBE_PATTERNS:
            if re.match(pattern, url):
                return StreamType.YOUTUBE
                
        # Check for HLS
        if '.m3u8' in url_lower or '/hls/' in url_lower:
            return StreamType.HLS
            
        # Check for MJPEG
        if any(x in url_lower for x in ['.mjpg', '.mjpeg', 'mjpg', '/mjpeg']):
            return StreamType.MJPEG
            
        # Check for direct video files
        video_extensions = ['.mp4', '.avi', '.mkv', '.mov', '.webm', '.flv']
        if any(url_lower.endswith(ext) for ext in video_extensions):
            return StreamType.HTTP_VIDEO
            
        # Default for HTTP URLs
        if url_lower.startswith('http://') or url_lower.startswith('https://'):
            # Could be MJPEG, HLS, or other HTTP stream
            return StreamType.HTTP_VIDEO
            
        return StreamType.UNKNOWN

    @classmethod
    async def resolve(cls, url: str) -> Tuple[str, StreamType, Optional[str]]:
        """
        Resolve a URL to a playable stream URL.
        
        Args:
            url: The original URL
            
        Returns:
            Tuple of (resolved_url, stream_type, error_message)
        """
        stream_type = cls.detect_stream_type(url)
        
        logger.info(f"Resolving URL: {url} (detected type: {stream_type.value})")
        
        try:
            if stream_type == StreamType.YOUTUBE:
                return await cls._resolve_youtube(url)
            elif stream_type == StreamType.HLS:
                return await cls._resolve_hls(url)
            elif stream_type in (StreamType.RTSP, StreamType.RTMP, StreamType.MJPEG, 
                                  StreamType.FILE, StreamType.WEBCAM, StreamType.HTTP_VIDEO):
                # Direct passthrough
                return url, stream_type, None
            else:
                # Try to resolve with yt-dlp as fallback
                return await cls._resolve_with_ytdlp(url)
        except Exception as e:
            logger.error(f"Error resolving URL {url}: {e}")
            return url, stream_type, str(e)

    @classmethod
    async def _resolve_youtube(cls, url: str) -> Tuple[str, StreamType, Optional[str]]:
        """Resolve YouTube URL to actual stream URL."""
        try:
            # Use yt-dlp to get the stream URL
            result = await asyncio.to_thread(
                cls._run_ytdlp,
                url,
                ['--format', 'best[ext=mp4]/best', '--get-url', '--no-playlist']
            )
            
            if result:
                logger.info(f"Resolved YouTube URL to: {result[:100]}...")
                return result, StreamType.YOUTUBE, None
            else:
                return url, StreamType.YOUTUBE, "Could not extract stream URL"
                
        except Exception as e:
            logger.error(f"YouTube resolution failed: {e}")
            return url, StreamType.YOUTUBE, str(e)

    @classmethod
    async def _resolve_hls(cls, url: str) -> Tuple[str, StreamType, Optional[str]]:
        """
        Resolve HLS stream.
        For HLS, we return the URL and let FFmpeg handle it directly.
        """
        # Validate the HLS URL is accessible
        try:
            # Try with yt-dlp first (handles authentication, etc.)
            result = await asyncio.to_thread(
                cls._run_ytdlp,
                url,
                ['--format', 'best', '--get-url', '--no-playlist']
            )
            
            if result:
                logger.info(f"Resolved HLS URL to: {result[:100]}...")
                return result, StreamType.HLS, None
        except Exception as e:
            logger.warning(f"yt-dlp HLS resolution failed, using original URL: {e}")
            
        # Return original URL - FFmpeg can handle m3u8 directly
        return url, StreamType.HLS, None

    @classmethod
    async def _resolve_with_ytdlp(cls, url: str) -> Tuple[str, StreamType, Optional[str]]:
        """Try to resolve any URL using yt-dlp."""
        try:
            result = await asyncio.to_thread(
                cls._run_ytdlp,
                url,
                ['--format', 'best[ext=mp4]/best', '--get-url', '--no-playlist']
            )
            
            if result:
                logger.info(f"Resolved URL with yt-dlp: {result[:100]}...")
                return result, StreamType.HTTP_VIDEO, None
                
        except Exception as e:
            logger.warning(f"yt-dlp resolution failed: {e}")
            
        return url, StreamType.UNKNOWN, "Could not resolve stream URL"

    @classmethod
    def _run_ytdlp(cls, url: str, extra_args: list = None) -> Optional[str]:
        """Run yt-dlp command and return the result."""
        try:
            cmd = ['python3', '-m', 'yt_dlp'] + (extra_args or []) + [url]
            
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if result.returncode == 0 and result.stdout.strip():
                return result.stdout.strip().split('\n')[0]  # Get first URL
                
            if result.stderr:
                logger.warning(f"yt-dlp stderr: {result.stderr[:200]}")
                
            return None
            
        except subprocess.TimeoutExpired:
            logger.error("yt-dlp timed out")
            return None
        except Exception as e:
            logger.error(f"yt-dlp error: {e}")
            return None

    @classmethod
    async def get_stream_info(cls, url: str) -> dict:
        """Get information about a stream."""
        stream_type = cls.detect_stream_type(url)
        resolved_url, _, error = await cls.resolve(url)
        
        return {
            "original_url": url,
            "resolved_url": resolved_url if resolved_url != url else None,
            "stream_type": stream_type.value,
            "error": error,
            "is_live": stream_type in (StreamType.RTSP, StreamType.RTMP, StreamType.HLS, StreamType.MJPEG),
        }
