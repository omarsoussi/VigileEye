"""Unit tests for GroupMember domain entity."""

from datetime import datetime, timezone
from uuid import uuid4

from domain.entities.group_member import GroupMember, GroupMemberStatus
from domain.entities.invitation import PermissionLevel


def test_group_member_defaults():
    gid = uuid4()
    m = GroupMember(group_id=gid, member_email="alice@test.com", access=PermissionLevel.READER)
    assert m.group_id == gid
    assert m.member_email == "alice@test.com"
    assert m.access == PermissionLevel.READER
    assert m.status == GroupMemberStatus.PENDING
    assert m.member_user_id is None
    assert m.handled_at is None
    assert m.invite_code_hash == ""


def test_group_member_editor():
    gid = uuid4()
    m = GroupMember(group_id=gid, member_email="bob@test.com", access=PermissionLevel.EDITOR)
    assert m.access == PermissionLevel.EDITOR


def test_group_member_status_enum():
    assert GroupMemberStatus.PENDING.value == "pending"
    assert GroupMemberStatus.ACCEPTED.value == "accepted"
    assert GroupMemberStatus.DECLINED.value == "declined"
