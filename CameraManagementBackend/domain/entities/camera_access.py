"""Camera access control entity."""
from __future__ import annotations
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from uuid import UUID, uuid4


class CameraPermission(str, Enum):
    """Camera permission levels."""
    VIEW = "view"
    MANAGE = "manage"


@dataclass
class CameraAccess:
    """Camera access entity for permission control."""
    id: UUID
    camera_id: UUID
    user_id: UUID
    permission: CameraPermission
    granted_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    @staticmethod
    def create(
        camera_id: UUID,
        user_id: UUID,
        permission: CameraPermission = CameraPermission.VIEW,
    ) -> CameraAccess:
        """Create a new camera access record."""
        return CameraAccess(
            id=uuid4(),
            camera_id=camera_id,
            user_id=user_id,
            permission=permission,
            granted_at=datetime.now(timezone.utc),
        )
