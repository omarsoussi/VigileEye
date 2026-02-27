"""Add groups and group_members tables.

Revision ID: 002_groups
Revises: 001_initial
Create Date: 2026-02-25

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "002_groups"
down_revision = "001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create group_member_status enum (IF NOT EXISTS for idempotency)
    op.execute("DO $$ BEGIN CREATE TYPE group_member_status AS ENUM ('pending', 'accepted', 'declined'); EXCEPTION WHEN duplicate_object THEN NULL; END $$")

    # Reference existing permission_level enum (already created by 001_initial)
    permission_level = postgresql.ENUM("reader", "editor", name="permission_level", create_type=False)
    group_member_status = postgresql.ENUM("pending", "accepted", "declined", name="group_member_status", create_type=False)

    op.create_table(
        "groups",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("owner_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("icon", sa.String(length=100), nullable=False, server_default="people"),
        sa.Column("color", sa.String(length=30), nullable=False, server_default="#4f46e5"),
        sa.Column("default_permission", permission_level, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    op.create_index("ix_groups_id", "groups", ["id"])
    op.create_index("ix_groups_owner_user_id", "groups", ["owner_user_id"])

    op.create_table(
        "group_members",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("group_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("groups.id", ondelete="CASCADE"), nullable=False),
        sa.Column("member_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("member_email", sa.String(length=320), nullable=False),
        sa.Column("access", permission_level, nullable=False),
        sa.Column("status", group_member_status, nullable=False),
        sa.Column("invite_code_hash", sa.String(length=200), nullable=False),
        sa.Column("code_expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("handled_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("group_id", "member_email", name="uq_group_member_email"),
    )

    op.create_index("ix_group_members_id", "group_members", ["id"])
    op.create_index("ix_group_members_group_id", "group_members", ["group_id"])
    op.create_index("ix_group_members_member_user_id", "group_members", ["member_user_id"])
    op.create_index("ix_group_members_member_email", "group_members", ["member_email"])

    # Group cameras junction table
    op.create_table(
        "group_cameras",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("group_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("groups.id", ondelete="CASCADE"), nullable=False),
        sa.Column("camera_id", sa.String(length=64), nullable=False),
        sa.UniqueConstraint("group_id", "camera_id", name="uq_group_camera"),
    )
    op.create_index("ix_group_cameras_group_id", "group_cameras", ["group_id"])


def downgrade() -> None:
    op.drop_index("ix_group_cameras_group_id", table_name="group_cameras")
    op.drop_table("group_cameras")

    op.drop_index("ix_group_members_member_email", table_name="group_members")
    op.drop_index("ix_group_members_member_user_id", table_name="group_members")
    op.drop_index("ix_group_members_group_id", table_name="group_members")
    op.drop_index("ix_group_members_id", table_name="group_members")
    op.drop_table("group_members")

    op.drop_index("ix_groups_owner_user_id", table_name="groups")
    op.drop_index("ix_groups_id", table_name="groups")
    op.drop_table("groups")

    op.execute("DROP TYPE IF EXISTS group_member_status")
