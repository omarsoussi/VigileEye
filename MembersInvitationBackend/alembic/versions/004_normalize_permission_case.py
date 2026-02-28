"""Normalize permission_level enum labels to lowercase.

The DB enum type was created with uppercase labels (READER/EDITOR).
SQLAlchemy expects lowercase labels (reader/editor).
Use ALTER TYPE ... RENAME VALUE to fix the enum labels in place —
no data rows need updating because PostgreSQL stores enums as ordinals.

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
    # Rename uppercase enum labels to lowercase, only if they exist.
    # Idempotent: checks pg_enum before renaming so re-runs are safe.
    op.execute("""
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM pg_enum e
                JOIN pg_type t ON e.enumtypid = t.oid
                WHERE t.typname = 'permission_level' AND e.enumlabel = 'READER'
            ) THEN
                ALTER TYPE permission_level RENAME VALUE 'READER' TO 'reader';
            END IF;

            IF EXISTS (
                SELECT 1 FROM pg_enum e
                JOIN pg_type t ON e.enumtypid = t.oid
                WHERE t.typname = 'permission_level' AND e.enumlabel = 'EDITOR'
            ) THEN
                ALTER TYPE permission_level RENAME VALUE 'EDITOR' TO 'editor';
            END IF;
        END $$;
    """)


def downgrade() -> None:
    # Restore uppercase labels if needed.
    op.execute("""
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM pg_enum e
                JOIN pg_type t ON e.enumtypid = t.oid
                WHERE t.typname = 'permission_level' AND e.enumlabel = 'reader'
            ) THEN
                ALTER TYPE permission_level RENAME VALUE 'reader' TO 'READER';
            END IF;

            IF EXISTS (
                SELECT 1 FROM pg_enum e
                JOIN pg_type t ON e.enumtypid = t.oid
                WHERE t.typname = 'permission_level' AND e.enumlabel = 'editor'
            ) THEN
                ALTER TYPE permission_level RENAME VALUE 'editor' TO 'EDITOR';
            END IF;
        END $$;
    """)


