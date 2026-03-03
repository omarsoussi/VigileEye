"""Add zones table

Revision ID: 002_zones
Revises: 001_initial
Create Date: 2026-02-28 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '002_zones'
down_revision: Union[str, None] = '001_initial'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'zones',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('camera_id', sa.UUID(), nullable=False),
        sa.Column('owner_user_id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('zone_type', sa.String(50), nullable=False, server_default='intrusion'),
        sa.Column('severity', sa.String(20), nullable=False, server_default='medium'),
        sa.Column('points_json', sa.Text(), nullable=False),
        sa.Column('color', sa.String(20), nullable=False, server_default='#ef4444'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('sensitivity', sa.Integer(), nullable=False, server_default='50'),
        sa.Column('min_trigger_duration', sa.Integer(), nullable=False, server_default='3'),
        sa.Column('alert_cooldown', sa.Integer(), nullable=False, server_default='30'),
        sa.Column('schedule_enabled', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('schedule_start', sa.String(10), nullable=True),
        sa.Column('schedule_end', sa.String(10), nullable=True),
        sa.Column('schedule_days', sa.String(100), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['camera_id'], ['cameras.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_zones_camera_id'), 'zones', ['camera_id'], unique=False)
    op.create_index(op.f('ix_zones_owner_user_id'), 'zones', ['owner_user_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_zones_owner_user_id'), table_name='zones')
    op.drop_index(op.f('ix_zones_camera_id'), table_name='zones')
    op.drop_table('zones')
