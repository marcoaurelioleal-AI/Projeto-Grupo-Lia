"""cancel the inventory and waste pilot

Revision ID: 20260809_0016
Revises: 20260808_0015
Create Date: 2026-08-09
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260809_0016"
down_revision = "20260808_0015"
branch_labels = None
depends_on = None


PILOT_TABLES = (
    "waste_records",
    "inventory_transfer_items",
    "inventory_movements",
    "inventory_transfers",
    "products",
)


def _scalar_count(bind: sa.Connection, query: str) -> int:
    return int(bind.execute(sa.text(query)).scalar_one())


def upgrade() -> None:
    bind = op.get_bind()

    operational_records = (
        _scalar_count(bind, "select count(*) from waste_records")
        + _scalar_count(bind, "select count(*) from inventory_transfers")
        + _scalar_count(
            bind,
            "select count(*) from inventory_movements "
            "where movement_type <> 'saldo_inicial'",
        )
    )
    if operational_records:
        raise RuntimeError(
            "A reversão foi bloqueada porque o piloto já possui perdas, transferências "
            "ou movimentações operacionais. Faça um backup e reconcilie esses dados antes."
        )

    fractional_balances = _scalar_count(
        bind,
        "select count(*) from inventory_items "
        "where quantity <> cast(quantity as integer)",
    )
    if fractional_balances:
        raise RuntimeError(
            "A reversão foi bloqueada porque existem saldos fracionados incompatíveis "
            "com o modelo de estoque anterior."
        )

    unexpected_leadership_accounts = _scalar_count(
        bind,
        "select count(*) from users "
        "where role = 'lideranca' and created_at < '2026-08-09 03:00:00'",
    )
    if unexpected_leadership_accounts:
        raise RuntimeError(
            "A reversão foi bloqueada porque há contas de liderança anteriores ao piloto."
        )

    op.drop_table("waste_records")
    op.drop_table("inventory_transfer_items")
    op.drop_table("inventory_movements")
    op.drop_table("inventory_transfers")

    with op.batch_alter_table("inventory_items") as batch_op:
        batch_op.drop_constraint("uq_inventory_unit_product", type_="unique")
        batch_op.drop_constraint("ck_inventory_items_quantity_nonnegative", type_="check")
        batch_op.drop_constraint("fk_inventory_items_product_id", type_="foreignkey")
        batch_op.drop_constraint("fk_inventory_items_store_id", type_="foreignkey")
        batch_op.drop_index("ix_inventory_items_product_id")
        batch_op.drop_index("ix_inventory_items_store_id")
        batch_op.alter_column(
            "quantity",
            existing_type=sa.Numeric(precision=12, scale=3),
            type_=sa.Integer(),
            existing_nullable=False,
            postgresql_using="quantity::integer",
        )
        batch_op.drop_column("active")
        batch_op.drop_column("unit_cost")
        batch_op.drop_column("product_id")
        batch_op.drop_column("store_id")

    op.drop_table("products")

    bind.execute(sa.text("delete from stores where name = 'Fábrica Lia'"))
    with op.batch_alter_table("stores") as batch_op:
        batch_op.drop_index("ix_stores_unit_type")
        batch_op.drop_column("unit_type")

    bind.execute(sa.text("delete from users where role = 'lideranca'"))


def downgrade() -> None:
    raise RuntimeError(
        "O piloto foi cancelado por decisão do produto e não deve ser reintroduzido "
        "por downgrade automático."
    )
