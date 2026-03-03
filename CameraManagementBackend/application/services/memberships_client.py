"""MembersInvitation service client (stdlib-only).

This module is intentionally dependency-free (no requests/httpx) so it can be
used in the CameraManagementBackend without adding new packages.
"""

from __future__ import annotations

from dataclasses import dataclass
import json
from typing import Dict, List, Optional
from uuid import UUID
import urllib.request


@dataclass(frozen=True)
class Membership:
    """A membership record returned by MembersInvitationBackend."""

    permission: str
    camera_ids: List[str]


def fetch_my_memberships(
    *,
    members_service_url: str,
    token: str,
    timeout_seconds: float = 2.0,
) -> List[Membership]:
    """Fetch memberships for the current user.

    Returns an empty list on any error to avoid breaking core camera operations.
    Callers should treat an empty list as "no shared access".
    """

    if not members_service_url:
        return []

    url = members_service_url.rstrip("/") + "/api/v1/memberships/mine"
    req = urllib.request.Request(
        url,
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/json",
        },
        method="GET",
    )

    try:
        with urllib.request.urlopen(req, timeout=timeout_seconds) as resp:
            raw = resp.read().decode("utf-8")
            data = json.loads(raw) if raw else []
    except Exception:
        return []

    memberships: List[Membership] = []
    if isinstance(data, list):
        for item in data:
            if not isinstance(item, dict):
                continue
            permission = str(item.get("permission") or "").strip().lower()
            camera_ids = item.get("camera_ids")
            if not isinstance(camera_ids, list):
                camera_ids = []
            memberships.append(Membership(permission=permission, camera_ids=[str(x) for x in camera_ids]))

    return memberships


def build_shared_camera_permission_map(memberships: List[Membership]) -> Dict[UUID, str]:
    """Build a camera_id -> permission map.

    If multiple memberships include the same camera, keep the strongest
    permission (editor > reader).
    """

    strength = {"reader": 1, "editor": 2}
    result: Dict[UUID, str] = {}

    for membership in memberships:
        perm = membership.permission
        if perm not in strength:
            continue
        for raw_camera_id in membership.camera_ids:
            try:
                camera_id = UUID(str(raw_camera_id))
            except ValueError:
                continue
            existing = result.get(camera_id)
            if not existing or strength.get(perm, 0) > strength.get(existing, 0):
                result[camera_id] = perm

    return result


def get_membership_permission_for_camera(
    *,
    members_service_url: str,
    token: str,
    camera_id: UUID,
    timeout_seconds: float = 2.0,
) -> Optional[str]:
    """Return 'reader'/'editor' if the user has membership for camera_id."""

    memberships = fetch_my_memberships(
        members_service_url=members_service_url,
        token=token,
        timeout_seconds=timeout_seconds,
    )
    perms = build_shared_camera_permission_map(memberships)
    return perms.get(camera_id)
