"""Domain Repository Interfaces."""
from domain.repositories.camera_repository import CameraRepositoryInterface
from domain.repositories.camera_access_repository import CameraAccessRepositoryInterface
from domain.repositories.camera_health_repository import CameraHealthRepositoryInterface
from domain.repositories.zone_repository import ZoneRepositoryInterface

__all__ = [
    "CameraRepositoryInterface",
    "CameraAccessRepositoryInterface",
    "CameraHealthRepositoryInterface",
    "ZoneRepositoryInterface",
]
