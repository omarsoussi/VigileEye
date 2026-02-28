"""Add group_cameras junction table.

Revision ID: 003_group_cameras
Revises: 002_groups
Create Date: 2026-02-26

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "003_group_cameras"
down_revision = "002_groups"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Guard: skip if group_cameras table already exists
    conn = op.get_bind()
    if conn.execute(
        sa.text("SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='group_cameras'")
    ).fetchone():
        return

    op.create_table(
        "group_cameras",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "group_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("groups.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("camera_id", sa.String(length=64), nullable=False),
        sa.UniqueConstraint("group_id", "camera_id", name="uq_group_camera"),
    )
    op.create_index("ix_group_cameras_group_id", "group_cameras", ["group_id"])


def downgrade() -> None:
    op.drop_index("ix_group_cameras_group_id", table_name="group_cameras")
    op.drop_table("group_cameras")
