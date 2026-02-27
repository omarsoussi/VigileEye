"""Unit tests for invite_group_member use case."""

from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch
from uuid import uuid4

import pytest

from application.use_cases.invite_group_member import InviteGroupMemberUseCase
from domain.entities.group import Group
from domain.entities.group_member import GroupMember
from domain.entities.invitation import PermissionLevel
from domain.exceptions import (
    GroupMemberAlreadyExistsException,
    GroupNotFoundException,
    UnauthorizedException,
)


def _settings():
    s = MagicMock()
    s.invitation_code_expire_minutes = 15
    return s


def _group(owner_id):
    return Group(owner_user_id=owner_id, name="Team", default_permission=PermissionLevel.READER)


def test_invite_success():
    owner = uuid4()
    group = _group(owner)

    group_repo = MagicMock()
    group_repo.get_by_id.return_value = group

    member_repo = MagicMock()
    member_repo.get_by_group_and_email.return_value = None
    member_repo.add.side_effect = lambda m: m

    email_sender = MagicMock()
    email_sender.send_invitation_code.return_value = True

    uc = InviteGroupMemberUseCase(group_repo, member_repo, email_sender, _settings())
    result = uc.execute(group.id, owner, "owner@test.com", "bob@test.com", "editor")

    assert result.member_email == "bob@test.com"
    assert result.access == PermissionLevel.EDITOR
    email_sender.send_invitation_code.assert_called_once()


def test_invite_uses_group_default_permission():
    owner = uuid4()
    group = _group(owner)

    group_repo = MagicMock()
    group_repo.get_by_id.return_value = group

    member_repo = MagicMock()
    member_repo.get_by_group_and_email.return_value = None
    member_repo.add.side_effect = lambda m: m

    email_sender = MagicMock()

    uc = InviteGroupMemberUseCase(group_repo, member_repo, email_sender, _settings())
    result = uc.execute(group.id, owner, "owner@test.com", "bob@test.com", None)

    assert result.access == PermissionLevel.READER  # group default


def test_invite_group_not_found():
    group_repo = MagicMock()
    group_repo.get_by_id.return_value = None
    uc = InviteGroupMemberUseCase(group_repo, MagicMock(), MagicMock(), _settings())
    with pytest.raises(GroupNotFoundException):
        uc.execute(uuid4(), uuid4(), "a@b.com", "c@d.com", None)


def test_invite_wrong_owner():
    owner = uuid4()
    group = _group(owner)
    group_repo = MagicMock()
    group_repo.get_by_id.return_value = group
    uc = InviteGroupMemberUseCase(group_repo, MagicMock(), MagicMock(), _settings())
    with pytest.raises(UnauthorizedException):
        uc.execute(group.id, uuid4(), "a@b.com", "c@d.com", None)


def test_invite_duplicate():
    owner = uuid4()
    group = _group(owner)
    group_repo = MagicMock()
    group_repo.get_by_id.return_value = group

    member_repo = MagicMock()
    member_repo.get_by_group_and_email.return_value = GroupMember(
        group_id=group.id, member_email="dup@test.com", access=PermissionLevel.READER
    )

    uc = InviteGroupMemberUseCase(group_repo, member_repo, MagicMock(), _settings())
    with pytest.raises(GroupMemberAlreadyExistsException):
        uc.execute(group.id, owner, "o@t.com", "dup@test.com", None)
