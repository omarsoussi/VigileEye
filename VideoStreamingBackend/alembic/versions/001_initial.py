"""Initial migration - create stream_sessions table

Revision ID: 001_initial
Revises: 
Create Date: 2026-01-21
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision: str = '001_initial'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create stream_status enum
    stream_status = postgresql.ENUM(
        'pending', 'connecting', 'active', 'reconnecting', 'stopped', 'error',
        name='stream_status',
        create_type=True
    )
    stream_status.create(op.get_bind(), checkfirst=True)

    # Create stream_sessions table
    op.create_table(
        'stream_sessions',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('camera_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('stream_url', sa.String(500), nullable=False),
        sa.Column('status', stream_status, nullable=False, server_default='pending'),
        sa.Column('fps', sa.Integer(), nullable=False, server_default='15'),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_frame_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('stopped_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('error_message', sa.String(1000), nullable=True),
        sa.Column('reconnect_attempts', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create index on camera_id for fast lookups
    op.create_index('ix_stream_sessions_camera_id', 'stream_sessions', ['camera_id'])
    op.create_index('ix_stream_sessions_status', 'stream_sessions', ['status'])


def downgrade() -> None:
    op.drop_index('ix_stream_sessions_status')
    op.drop_index('ix_stream_sessions_camera_id')
    op.drop_table('stream_sessions')
    
    # Drop enum
    op.execute('DROP TYPE IF EXISTS stream_status')
