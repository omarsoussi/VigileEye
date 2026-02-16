"""Initial camera tables

Revision ID: 001_initial
Revises: 
Create Date: 2024-01-01 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '001_initial'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create cameras table
    op.create_table(
        'cameras',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('owner_user_id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('stream_url', sa.String(1024), nullable=False),
        sa.Column('protocol', sa.String(50), nullable=False),
        sa.Column('username', sa.String(255), nullable=True),
        sa.Column('password', sa.String(255), nullable=True),
        sa.Column('resolution', sa.String(50), nullable=True),
        sa.Column('fps', sa.Integer(), nullable=True),
        sa.Column('encoding', sa.String(50), nullable=True),
        sa.Column('status', sa.String(20), nullable=False, server_default='offline'),
        sa.Column('camera_type', sa.String(50), nullable=False, server_default='fixed'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('building', sa.String(255), nullable=True),
        sa.Column('floor', sa.String(50), nullable=True),
        sa.Column('zone', sa.String(255), nullable=True),
        sa.Column('room', sa.String(255), nullable=True),
        sa.Column('gps_lat', sa.Float(), nullable=True),
        sa.Column('gps_long', sa.Float(), nullable=True),
        sa.Column('last_heartbeat', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_cameras_owner_user_id'), 'cameras', ['owner_user_id'], unique=False)
    op.create_index(op.f('ix_cameras_status'), 'cameras', ['status'], unique=False)

    # Create camera_access table
    op.create_table(
        'camera_access',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('camera_id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('permission', sa.String(20), nullable=False, server_default='view'),
        sa.Column('granted_by', sa.UUID(), nullable=False),
        sa.Column('granted_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['camera_id'], ['cameras.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('camera_id', 'user_id', name='uq_camera_user_access')
    )
    op.create_index(op.f('ix_camera_access_camera_id'), 'camera_access', ['camera_id'], unique=False)
    op.create_index(op.f('ix_camera_access_user_id'), 'camera_access', ['user_id'], unique=False)

    # Create camera_health table
    op.create_table(
        'camera_health',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('camera_id', sa.UUID(), nullable=False),
        sa.Column('last_heartbeat', sa.DateTime(timezone=True), nullable=False),
        sa.Column('latency_ms', sa.Integer(), nullable=True),
        sa.Column('frame_drop_rate', sa.Float(), nullable=True),
        sa.Column('uptime_percentage', sa.Float(), nullable=True),
        sa.Column('recorded_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['camera_id'], ['cameras.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_camera_health_camera_id'), 'camera_health', ['camera_id'], unique=False)


def downgrade() -> None:
    op.drop_table('camera_health')
    op.drop_table('camera_access')
    op.drop_table('cameras')
