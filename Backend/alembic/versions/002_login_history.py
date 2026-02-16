"""Add login_history table

Revision ID: 002_login_history
Revises: 001_initial
Create Date: 2025-01-29

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


# revision identifiers, used by Alembic.
revision: str = '002_login_history'
down_revision: Union[str, None] = '001_initial'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create login_history table."""
    op.create_table(
        'login_history',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, index=True),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('timestamp', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False, index=True),
        sa.Column('ip_address', sa.String(45), nullable=False),
        sa.Column('user_agent', sa.Text, nullable=True),
        sa.Column('device_type', sa.String(20), default='desktop', nullable=False),
        sa.Column('browser', sa.String(100), nullable=True),
        sa.Column('os', sa.String(100), nullable=True),
        sa.Column('location', sa.String(255), nullable=True),
        sa.Column('success', sa.Boolean, default=True, nullable=False),
        sa.Column('is_suspicious', sa.Boolean, default=False, nullable=False),
        sa.Column('failure_reason', sa.String(255), nullable=True),
    )
    
    # Create indexes
    op.create_index('ix_login_history_user_timestamp', 'login_history', ['user_id', 'timestamp'])


def downgrade() -> None:
    """Drop login_history table."""
    op.drop_index('ix_login_history_user_timestamp', table_name='login_history')
    op.drop_table('login_history')
