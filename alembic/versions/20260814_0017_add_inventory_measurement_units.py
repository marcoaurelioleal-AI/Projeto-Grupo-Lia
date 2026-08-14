"""add inventory measurement units

Revision ID: 20260814_0017
Revises: 20260809_0016
Create Date: 2026-08-14
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260814_0017"
down_revision = "20260809_0016"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("inventory_items") as batch_op:
        batch_op.alter_column(
            "quantity",
            existing_type=sa.Integer(),
            type_=sa.Numeric(precision=12, scale=3),
            existing_nullable=False,
            postgresql_using="quantity::numeric(12, 3)",
        )
        batch_op.add_column(
            sa.Column("unit", sa.String(length=10), nullable=False, server_default="un")
        )


def downgrade() -> None:
    bind = op.get_bind()
    fractional_balances = int(
        bind.execute(
            sa.text(
                "select count(*) from inventory_items "
                "where quantity <> cast(quantity as integer)"
            )
        ).scalar_one()
    )
    if fractional_balances:
        raise RuntimeError(
            "O downgrade foi bloqueado porque existem quantidades fracionadas no estoque."
        )

    with op.batch_alter_table("inventory_items") as batch_op:
        batch_op.drop_column("unit")
        batch_op.alter_column(
            "quantity",
            existing_type=sa.Numeric(precision=12, scale=3),
            type_=sa.Integer(),
            existing_nullable=False,
            postgresql_using="quantity::integer",
        )
