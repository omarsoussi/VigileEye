"""Unit tests for resend_group_codes use cases."""

from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock
from uuid import uuid4

import pytest

from application.use_cases.resend_group_codes import (
    ResendAllGroupCodesUseCase,
    ResendGroupMemberCodeUseCase,
)
from domain.entities.group import Group
from domain.entities.group_member import GroupMember, GroupMemberStatus
from domain.entities.invitation import PermissionLevel
from domain.exceptions import (
    GroupMemberAlreadyHandledException,
    GroupMemberNotFoundException,
    GroupNotFoundException,
    UnauthorizedException,
)


def _settings():
    s = MagicMock()
    s.invitation_code_expire_minutes = 15
    return s


def _group(owner_id):
    return Group(owner_user_id=owner_id, name="G", default_permission=PermissionLevel.READER)


def _member(group_id, email):
    return GroupMember(
        group_id=group_id,
        member_email=email,
        access=PermissionLevel.READER,
        invite_code_hash="oldhash",
        code_expires_at=datetime.now(timezone.utc) + timedelta(minutes=5),
    )


def test_resend_single_success():
    owner = uuid4()
    group = _group(owner)
    member = _member(group.id, "a@b.com")

    group_repo = MagicMock()
    group_repo.get_by_id.return_value = group
    member_repo = MagicMock()
    member_repo.get_by_id.return_value = member
    member_repo.update.side_effect = lambda m: m
    email_sender = MagicMock()

    uc = ResendGroupMemberCodeUseCase(group_repo, member_repo, email_sender, _settings())
    uc.execute(group.id, member.id, owner, "owner@test.com")
    email_sender.send_invitation_code.assert_called_once()


def test_resend_single_wrong_owner():
    owner = uuid4()
    group = _group(owner)
    group_repo = MagicMock()
    group_repo.get_by_id.return_value = group
    uc = ResendGroupMemberCodeUseCase(group_repo, MagicMock(), MagicMock(), _settings())
    with pytest.raises(UnauthorizedException):
        uc.execute(group.id, uuid4(), uuid4(), "x@y.com")


def test_resend_all_success():
    owner = uuid4()
    group = _group(owner)

    pending = [_member(group.id, f"m{i}@t.com") for i in range(3)]
    group_repo = MagicMock()
    group_repo.get_by_id.return_value = group
    member_repo = MagicMock()
    member_repo.list_pending_by_group.return_value = pending
    member_repo.update.side_effect = lambda m: m
    email_sender = MagicMock()

    uc = ResendAllGroupCodesUseCase(group_repo, member_repo, email_sender, _settings())
    count = uc.execute(group.id, owner, "owner@t.com")
    assert count == 3
    assert email_sender.send_invitation_code.call_count == 3
