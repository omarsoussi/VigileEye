"""Data Transfer Objects."""
from application.dtos.camera_requests import (
    CreateCameraRequest,
    UpdateCameraRequest,
    GrantAccessRequest,
    RecordHealthRequest,
    CameraLocationRequest,
)
from application.dtos.camera_responses import (
    CameraResponse,
    CameraLocationResponse,
    CameraHealthResponse,
    CameraAccessResponse,
    MessageResponse,
)

__all__ = [
    "CreateCameraRequest",
    "UpdateCameraRequest",
    "GrantAccessRequest",
    "RecordHealthRequest",
    "CameraLocationRequest",
    "CameraResponse",
    "CameraLocationResponse",
    "CameraHealthResponse",
    "CameraAccessResponse",
    "MessageResponse",
]
