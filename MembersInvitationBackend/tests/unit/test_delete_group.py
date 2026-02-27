"""Unit tests for delete_group use case."""

from unittest.mock import MagicMock
from uuid import uuid4

import pytest

from application.use_cases.delete_group import DeleteGroupUseCase
from domain.entities.group import Group
from domain.entities.invitation import PermissionLevel
from domain.exceptions import GroupNotFoundException, UnauthorizedException


def _make_group(owner_id):
    return Group(owner_user_id=owner_id, name="G", default_permission=PermissionLevel.READER)


def test_delete_group_success():
    owner = uuid4()
    group = _make_group(owner)
    repo = MagicMock()
    repo.get_by_id.return_value = group
    uc = DeleteGroupUseCase(repo)
    uc.execute(group.id, owner)
    repo.delete.assert_called_once_with(group.id)


def test_delete_group_not_found():
    repo = MagicMock()
    repo.get_by_id.return_value = None
    with pytest.raises(GroupNotFoundException):
        DeleteGroupUseCase(repo).execute(uuid4(), uuid4())


def test_delete_group_wrong_owner():
    owner = uuid4()
    group = _make_group(owner)
    repo = MagicMock()
    repo.get_by_id.return_value = group
    with pytest.raises(UnauthorizedException):
        DeleteGroupUseCase(repo).execute(group.id, uuid4())
