"""add active to manuals

Revision ID: 20260508_0005
Revises: 20260508_0004
Create Date: 2026-05-08
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260508_0005"
down_revision = "20260508_0004"
branch_labels = None
depends_on = None


def _column_names(table_name: str) -> set[str]:
    inspector = sa.inspect(op.get_bind())
    if not inspector.has_table(table_name):
        return set()
    return {column["name"] for column in inspector.get_columns(table_name)}


def _add_active_column(table_name: str) -> None:
    if "active" not in _column_names(table_name):
        op.add_column(table_name, sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()))


def upgrade() -> None:
    _add_active_column("manuals")
    _add_active_column("manual_sections")
    _add_active_column("manual_steps")


def downgrade() -> None:
    for table_name in ("manual_steps", "manual_sections", "manuals"):
        if "active" in _column_names(table_name):
            op.drop_column(table_name, "active")
