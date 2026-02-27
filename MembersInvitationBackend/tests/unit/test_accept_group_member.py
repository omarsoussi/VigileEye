"""Unit tests for accept_group_member use case."""

from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock
from uuid import uuid4

import pytest

from application.use_cases.accept_group_member import AcceptGroupMemberUseCase
from domain.entities.group import Group
from domain.entities.group_member import GroupMember, GroupMemberStatus
from domain.entities.invitation import PermissionLevel
from domain.exceptions import (
    GroupCodeExpiredException,
    GroupMemberAlreadyHandledException,
    GroupMemberNotFoundException,
    GroupNotFoundException,
    InvalidGroupCodeException,
    UnauthorizedException,
)
from infrastructure.security.password_hasher import PasswordHasher


def _group(owner_id):
    return Group(owner_user_id=owner_id, name="T", default_permission=PermissionLevel.READER)


def _member(group_id, email, code="123456"):
    return GroupMember(
        group_id=group_id,
        member_email=email,
        access=PermissionLevel.READER,
        invite_code_hash=PasswordHasher.hash(code),
        code_expires_at=datetime.now(timezone.utc) + timedelta(minutes=15),
    )


def test_accept_success():
    owner = uuid4()
    user_id = uuid4()
    group = _group(owner)
    member = _member(group.id, "alice@test.com")

    group_repo = MagicMock()
    group_repo.get_by_id.return_value = group

    member_repo = MagicMock()
    member_repo.get_by_id.return_value = member
    member_repo.update.side_effect = lambda m: m

    membership_repo = MagicMock()
    membership_repo.get_by_owner_and_member.return_value = None
    membership_repo.add.side_effect = lambda m: m

    uc = AcceptGroupMemberUseCase(group_repo, member_repo, membership_repo)
    result = uc.execute(group.id, member.id, user_id, "alice@test.com", "123456")

    assert result.member_email == "alice@test.com"
    membership_repo.add.assert_called_once()


def test_accept_wrong_email():
    owner = uuid4()
    group = _group(owner)
    member = _member(group.id, "alice@test.com")

    group_repo = MagicMock()
    group_repo.get_by_id.return_value = group
    member_repo = MagicMock()
    member_repo.get_by_id.return_value = member

    uc = AcceptGroupMemberUseCase(group_repo, member_repo, MagicMock())
    with pytest.raises(UnauthorizedException):
        uc.execute(group.id, member.id, uuid4(), "wrong@test.com", "123456")


def test_accept_already_handled():
    owner = uuid4()
    group = _group(owner)
    member = _member(group.id, "alice@test.com")
    member.status = GroupMemberStatus.ACCEPTED

    group_repo = MagicMock()
    group_repo.get_by_id.return_value = group
    member_repo = MagicMock()
    member_repo.get_by_id.return_value = member

    uc = AcceptGroupMemberUseCase(group_repo, member_repo, MagicMock())
    with pytest.raises(GroupMemberAlreadyHandledException):
        uc.execute(group.id, member.id, uuid4(), "alice@test.com", "123456")


def test_accept_expired_code():
    owner = uuid4()
    group = _group(owner)
    member = _member(group.id, "alice@test.com")
    member.code_expires_at = datetime.now(timezone.utc) - timedelta(minutes=1)

    group_repo = MagicMock()
    group_repo.get_by_id.return_value = group
    member_repo = MagicMock()
    member_repo.get_by_id.return_value = member

    uc = AcceptGroupMemberUseCase(group_repo, member_repo, MagicMock())
    with pytest.raises(GroupCodeExpiredException):
        uc.execute(group.id, member.id, uuid4(), "alice@test.com", "123456")


def test_accept_invalid_code():
    owner = uuid4()
    group = _group(owner)
    member = _member(group.id, "alice@test.com")

    group_repo = MagicMock()
    group_repo.get_by_id.return_value = group
    member_repo = MagicMock()
    member_repo.get_by_id.return_value = member

    uc = AcceptGroupMemberUseCase(group_repo, member_repo, MagicMock())
    with pytest.raises(InvalidGroupCodeException):
        uc.execute(group.id, member.id, uuid4(), "alice@test.com", "999999")
