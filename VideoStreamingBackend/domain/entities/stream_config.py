"""StreamConfig domain entity."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Optional


@dataclass
class StreamConfig:
    """
    Configuration for a video stream.
    
    Attributes:
        fps: Target frames per second
        quality: JPEG quality (1-100)
        width: Target width (None = original)
        height: Target height (None = original)
        max_reconnects: Maximum reconnection attempts
    """
    fps: int = 15
    quality: int = 85
    width: Optional[int] = None
    height: Optional[int] = None
    max_reconnects: int = 5

    def __post_init__(self):
        """Validate configuration values."""
        if self.fps < 1 or self.fps > 60:
            raise ValueError("FPS must be between 1 and 60")
        if self.quality < 1 or self.quality > 100:
            raise ValueError("Quality must be between 1 and 100")
        if self.width is not None and self.width < 1:
            raise ValueError("Width must be positive")
        if self.height is not None and self.height < 1:
            raise ValueError("Height must be positive")
