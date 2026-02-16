"""Frame encoder for video frames."""
from __future__ import annotations

from typing import Optional

import cv2
import numpy as np

from domain.entities.video_frame import FrameEncoding


class FrameEncoder:
    """
    Encodes video frames to JPEG/PNG for transmission.
    """

    def __init__(self, quality: int = 85):
        """
        Initialize encoder.
        
        Args:
            quality: JPEG quality (1-100)
        """
        self.quality = max(1, min(100, quality))

    def encode_jpeg(self, frame: np.ndarray) -> bytes:
        """
        Encode frame to JPEG.
        
        Args:
            frame: OpenCV frame (BGR format)
            
        Returns:
            JPEG bytes
        """
        encode_params = [cv2.IMWRITE_JPEG_QUALITY, self.quality]
        success, buffer = cv2.imencode(".jpg", frame, encode_params)
        if not success:
            raise ValueError("Failed to encode frame to JPEG")
        return buffer.tobytes()

    def encode_png(self, frame: np.ndarray) -> bytes:
        """
        Encode frame to PNG.
        
        Args:
            frame: OpenCV frame (BGR format)
            
        Returns:
            PNG bytes
        """
        success, buffer = cv2.imencode(".png", frame)
        if not success:
            raise ValueError("Failed to encode frame to PNG")
        return buffer.tobytes()

    def encode(
        self,
        frame: np.ndarray,
        encoding: FrameEncoding = FrameEncoding.JPEG,
    ) -> bytes:
        """
        Encode frame with specified encoding.
        
        Args:
            frame: OpenCV frame (BGR format)
            encoding: Target encoding format
            
        Returns:
            Encoded bytes
        """
        if encoding == FrameEncoding.JPEG:
            return self.encode_jpeg(frame)
        elif encoding == FrameEncoding.PNG:
            return self.encode_png(frame)
        else:
            # RAW - convert to bytes directly
            return frame.tobytes()

    def resize(
        self,
        frame: np.ndarray,
        width: Optional[int] = None,
        height: Optional[int] = None,
    ) -> np.ndarray:
        """
        Resize a frame.
        
        Args:
            frame: Input frame
            width: Target width (None = keep aspect)
            height: Target height (None = keep aspect)
            
        Returns:
            Resized frame
        """
        if width is None and height is None:
            return frame

        h, w = frame.shape[:2]

        if width is None:
            # Calculate width from height
            aspect = w / h
            width = int(height * aspect)
        elif height is None:
            # Calculate height from width
            aspect = h / w
            height = int(width * aspect)

        return cv2.resize(frame, (width, height))
