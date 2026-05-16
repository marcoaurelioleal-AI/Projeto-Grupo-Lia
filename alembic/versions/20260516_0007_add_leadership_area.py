"""add leadership area

Revision ID: 20260516_0007
Revises: 20260508_0006
Create Date: 2026-05-16
"""

from __future__ import annotations

from collections.abc import Callable

import sqlalchemy as sa
from alembic import op

revision = "20260516_0007"
down_revision = "20260508_0006"
branch_labels = None
depends_on = None


def _create_if_missing(table_name: str, create: Callable[[], None]) -> None:
    inspector = sa.inspect(op.get_bind())
    if not inspector.has_table(table_name):
        create()


def upgrade() -> None:
    _create_if_missing(
        "leadership_employees",
        lambda: op.create_table(
            "leadership_employees",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("name", sa.String(length=120), nullable=False),
            sa.Column("store", sa.String(length=80), nullable=False),
            sa.Column("position", sa.String(length=120), nullable=True),
            sa.Column("active", sa.Boolean(), nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=False),
        ),
    )
    _create_if_missing(
        "leadership_records",
        lambda: op.create_table(
            "leadership_records",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("employee_id", sa.Integer(), sa.ForeignKey("leadership_employees.id"), nullable=False),
            sa.Column("record_type", sa.String(length=30), nullable=False),
            sa.Column("description", sa.Text(), nullable=False),
            sa.Column("applied_at", sa.Date(), nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("created_by", sa.String(length=120), nullable=False),
        ),
    )
    op.create_index(op.f("ix_leadership_employees_name"), "leadership_employees", ["name"], unique=False, if_not_exists=True)
    op.create_index(
        op.f("ix_leadership_employees_store"),
        "leadership_employees",
        ["store"],
        unique=False,
        if_not_exists=True,
    )
    op.create_index(
        op.f("ix_leadership_records_employee_id"),
        "leadership_records",
        ["employee_id"],
        unique=False,
        if_not_exists=True,
    )
    op.create_index(
        op.f("ix_leadership_records_record_type"),
        "leadership_records",
        ["record_type"],
        unique=False,
        if_not_exists=True,
    )
    op.create_index(
        op.f("ix_leadership_records_applied_at"),
        "leadership_records",
        ["applied_at"],
        unique=False,
        if_not_exists=True,
    )


def downgrade() -> None:
    op.drop_table("leadership_records", if_exists=True)
    op.drop_table("leadership_employees", if_exists=True)
