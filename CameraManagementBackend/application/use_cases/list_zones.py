"""Use case: List zones for a camera or user."""
from __future__ import annotations
from uuid import UUID
from typing import List
from domain.entities.zone import Zone
from domain.repositories.zone_repository import ZoneRepositoryInterface


class ListZonesByCameraUseCase:
    """List all zones for a camera."""

    def __init__(self, zone_repo: ZoneRepositoryInterface):
        self.zone_repo = zone_repo

    def execute(self, camera_id: UUID) -> List[Zone]:
        return self.zone_repo.get_by_camera(camera_id)


class ListZonesByOwnerUseCase:
    """List all zones owned by a user."""

    def __init__(self, zone_repo: ZoneRepositoryInterface):
        self.zone_repo = zone_repo

    def execute(self, owner_user_id: UUID) -> List[Zone]:
        return self.zone_repo.get_by_owner(owner_user_id)
