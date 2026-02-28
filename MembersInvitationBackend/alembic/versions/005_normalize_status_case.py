"""Normalize invitation_status enum labels to lowercase.

The DB enum type was created with uppercase labels (PENDING/ACCEPTED/etc).
SQLAlchemy expects lowercase labels. Use ALTER TYPE ... RENAME VALUE.

Revision ID: 005_normalize_status_case
Revises: 004_normalize_permission_case
Create Date: 2026-02-28
"""

from alembic import op

revision = "005_normalize_status_case"
down_revision = "004_normalize_permission_case"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        DO $$
        DECLARE
            label TEXT;
        BEGIN
            FOR label IN SELECT enumlabel FROM pg_enum e
                         JOIN pg_type t ON e.enumtypid = t.oid
                         WHERE t.typname = 'invitation_status'
                           AND e.enumlabel <> LOWER(e.enumlabel)
            LOOP
                EXECUTE format(
                    'ALTER TYPE invitation_status RENAME VALUE %L TO %L',
                    label, LOWER(label)
                );
            END LOOP;
        END $$;
    """)


def downgrade() -> None:
    pass
