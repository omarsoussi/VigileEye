"""Unit tests for Group domain entity."""

from datetime import datetime, timezone
from uuid import uuid4

from domain.entities.group import Group
from domain.entities.invitation import PermissionLevel


def test_group_creation_defaults():
    uid = uuid4()
    g = Group(owner_user_id=uid, name="HR Team", default_permission=PermissionLevel.READER)
    assert g.name == "HR Team"
    assert g.owner_user_id == uid
    assert g.default_permission == PermissionLevel.READER
    assert g.icon == "people"
    assert g.color == "#4f46e5"
    assert g.description is None
    assert isinstance(g.id, type(uid))
    assert isinstance(g.created_at, datetime)
    assert isinstance(g.updated_at, datetime)


def test_group_creation_custom():
    uid = uuid4()
    g = Group(
        owner_user_id=uid,
        name="Security Ops",
        default_permission=PermissionLevel.EDITOR,
        description="Security operations team",
        icon="shield",
        color="#dc2626",
    )
    assert g.name == "Security Ops"
    assert g.default_permission == PermissionLevel.EDITOR
    assert g.description == "Security operations team"
    assert g.icon == "shield"
    assert g.color == "#dc2626"
