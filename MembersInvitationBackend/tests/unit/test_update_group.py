"""Unit tests for update_group use case."""

from unittest.mock import MagicMock
from uuid import uuid4

import pytest

from application.use_cases.update_group import UpdateGroupUseCase
from domain.entities.group import Group
from domain.entities.invitation import PermissionLevel
from domain.exceptions import GroupNotFoundException, UnauthorizedException


def _make_group(owner_id):
    return Group(
        owner_user_id=owner_id,
        name="Old Name",
        default_permission=PermissionLevel.READER,
    )


def test_update_group_success():
    owner = uuid4()
    group = _make_group(owner)
    repo = MagicMock()
    repo.get_by_id.return_value = group
    repo.update.side_effect = lambda g: g

    uc = UpdateGroupUseCase(repo)
    result = uc.execute(group.id, owner, name="New Name", icon="star", color="#dc2626")
    assert result.name == "New Name"
    assert result.icon == "star"
    assert result.color == "#dc2626"


def test_update_group_not_found():
    repo = MagicMock()
    repo.get_by_id.return_value = None
    uc = UpdateGroupUseCase(repo)
    with pytest.raises(GroupNotFoundException):
        uc.execute(uuid4(), uuid4(), name="x")


def test_update_group_wrong_owner():
    owner = uuid4()
    group = _make_group(owner)
    repo = MagicMock()
    repo.get_by_id.return_value = group
    uc = UpdateGroupUseCase(repo)
    with pytest.raises(UnauthorizedException):
        uc.execute(group.id, uuid4(), name="x")
