"""Add 'icon' column to zones

Revision ID: 003_add_icon_to_zones
Revises: 002_zones
Create Date: 2026-03-01 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '003_add_icon_to_zones'
down_revision: Union[str, None] = '002_zones'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('zones', sa.Column('icon', sa.String(100), nullable=True))


def downgrade() -> None:
    op.drop_column('zones', 'icon')
