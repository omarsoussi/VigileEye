"""Normalize permission_level enum values to lowercase.

Some existing rows contain 'READER'/'EDITOR' (uppercase) which don't match
the SQLAlchemy-side enum values ('reader'/'editor'). This migration:
  1. Converts all four affected columns to plain text
  2. Drops and recreates the permission_level enum type with lowercase labels
  3. Lowercases the existing data
  4. Converts the columns back to the enum type

Revision ID: 004_normalize_permission_case
Revises: 003_group_cameras
Create Date: 2026-02-28
"""

from alembic import op

# revision identifiers
revision = "004_normalize_permission_case"
down_revision = "003_group_cameras"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── Step 1: Detach columns from the enum so we can manipulate it ──
    for table, column in [
        ("invitations", "permission"),
        ("memberships", "permission"),
        ("groups", "default_permission"),
        ("group_members", "access"),
    ]:
        op.execute(f"ALTER TABLE {table} ALTER COLUMN {column} TYPE text")

    # ── Step 2: Drop the existing enum type (may have wrong-cased labels) ──
    op.execute("DROP TYPE IF EXISTS permission_level")

    # ── Step 3: Normalise all values to lowercase ──
    for table, column in [
        ("invitations", "permission"),
        ("memberships", "permission"),
        ("groups", "default_permission"),
        ("group_members", "access"),
    ]:
        op.execute(f"UPDATE {table} SET {column} = LOWER({column})")

    # ── Step 4: Recreate enum type with lowercase labels ──
    op.execute("CREATE TYPE permission_level AS ENUM ('reader', 'editor')")

    # ── Step 5: Re-attach columns to the new enum type ──
    for table, column in [
        ("invitations", "permission"),
        ("memberships", "permission"),
        ("groups", "default_permission"),
        ("group_members", "access"),
    ]:
        op.execute(
            f"ALTER TABLE {table} "
            f"ALTER COLUMN {column} TYPE permission_level "
            f"USING {column}::permission_level"
        )


def downgrade() -> None:
    # Reverse: go back to uppercase enum values
    for table, column in [
        ("invitations", "permission"),
        ("memberships", "permission"),
        ("groups", "default_permission"),
        ("group_members", "access"),
    ]:
        op.execute(f"ALTER TABLE {table} ALTER COLUMN {column} TYPE text")

    op.execute("DROP TYPE IF EXISTS permission_level")

    for table, column in [
        ("invitations", "permission"),
        ("memberships", "permission"),
        ("groups", "default_permission"),
        ("group_members", "access"),
    ]:
        op.execute(f"UPDATE {table} SET {column} = UPPER({column})")

    op.execute("CREATE TYPE permission_level AS ENUM ('READER', 'EDITOR')")

    for table, column in [
        ("invitations", "permission"),
        ("memberships", "permission"),
        ("groups", "default_permission"),
        ("group_members", "access"),
    ]:
        op.execute(
            f"ALTER TABLE {table} "
            f"ALTER COLUMN {column} TYPE permission_level "
            f"USING {column}::permission_level"
        )
