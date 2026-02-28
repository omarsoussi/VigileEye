"""Initial tables for invitations and memberships.

Revision ID: 001_initial
Revises:
Create Date: 2026-01-20

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Guard: skip entirely if invitations table already exists (idempotent re-run)
    conn = op.get_bind()
    exists = conn.execute(
        sa.text("SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='invitations'")
    ).fetchone()
    if exists:
        return

    # Create enum types safely (no-op if they already exist)
    op.execute(
        "DO $$ BEGIN "
        "CREATE TYPE permission_level AS ENUM ('reader', 'editor'); "
        "EXCEPTION WHEN duplicate_object THEN NULL; END $$"
    )
    op.execute(
        "DO $$ BEGIN "
        "CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'declined', 'canceled', 'expired'); "
        "EXCEPTION WHEN duplicate_object THEN NULL; END $$"
    )

    # Use create_type=False so SQLAlchemy doesn't try to re-create the enum types
    permission_level = postgresql.ENUM("reader", "editor", name="permission_level", create_type=False)
    invitation_status = postgresql.ENUM("pending", "accepted", "declined", "canceled", "expired", name="invitation_status", create_type=False)

    op.create_table(
        "invitations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("inviter_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("inviter_email", sa.String(length=320), nullable=False),
        sa.Column("recipient_email", sa.String(length=320), nullable=False),
        sa.Column("permission", permission_level, nullable=False),
        sa.Column("status", invitation_status, nullable=False),
        sa.Column("unlimited", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("code_hash", sa.String(length=200), nullable=False),
        sa.Column("code_expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("handled_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_index("ix_invitations_inviter_user_id", "invitations", ["inviter_user_id"])
    op.create_index("ix_invitations_inviter_email", "invitations", ["inviter_email"])
    op.create_index("ix_invitations_recipient_email", "invitations", ["recipient_email"])

    op.create_table(
        "invitation_cameras",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("invitation_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("invitations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("camera_id", sa.String(length=64), nullable=False),
        sa.UniqueConstraint("invitation_id", "camera_id", name="uq_invitation_camera"),
    )
    op.create_index("ix_invitation_cameras_invitation_id", "invitation_cameras", ["invitation_id"])

    op.create_table(
        "memberships",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("owner_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("member_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("member_email", sa.String(length=320), nullable=False),
        sa.Column("permission", permission_level, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_index("ix_memberships_owner_user_id", "memberships", ["owner_user_id"])
    op.create_index("ix_memberships_member_user_id", "memberships", ["member_user_id"])
    op.create_index("ix_memberships_member_email", "memberships", ["member_email"])

    op.create_table(
        "membership_cameras",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("membership_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("memberships.id", ondelete="CASCADE"), nullable=False),
        sa.Column("camera_id", sa.String(length=64), nullable=False),
        sa.UniqueConstraint("membership_id", "camera_id", name="uq_membership_camera"),
    )
    op.create_index("ix_membership_cameras_membership_id", "membership_cameras", ["membership_id"])


def downgrade() -> None:
    op.drop_index("ix_membership_cameras_membership_id", table_name="membership_cameras")
    op.drop_table("membership_cameras")

    op.drop_table("memberships")

    op.drop_index("ix_invitation_cameras_invitation_id", table_name="invitation_cameras")
    op.drop_table("invitation_cameras")

    op.drop_table("invitations")

    op.execute("DROP TYPE IF EXISTS invitation_status")
    # permission_level is shared by multiple tables
    op.execute("DROP TYPE IF EXISTS permission_level")
