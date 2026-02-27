"""Unit tests for create_group use case."""

from unittest.mock import MagicMock
from uuid import uuid4

from application.use_cases.create_group import CreateGroupUseCase
from domain.entities.group import Group
from domain.entities.invitation import PermissionLevel


def test_create_group_success():
    repo = MagicMock()
    repo.add.side_effect = lambda g: g  # return as-is

    uc = CreateGroupUseCase(repo)
    uid = uuid4()
    group = uc.execute(
        owner_user_id=uid,
        name="DevOps",
        default_permission="reader",
        description="Dev ops team",
        icon="settings",
        color="#0891b2",
    )
    assert group.name == "DevOps"
    assert group.default_permission == PermissionLevel.READER
    assert group.icon == "settings"
    assert group.color == "#0891b2"
    repo.add.assert_called_once()


def test_create_group_editor_permission():
    repo = MagicMock()
    repo.add.side_effect = lambda g: g

    uc = CreateGroupUseCase(repo)
    group = uc.execute(
        owner_user_id=uuid4(),
        name="Admins",
        default_permission="editor",
    )
    assert group.default_permission == PermissionLevel.EDITOR
