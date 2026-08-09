"""add the auditable inventory and waste pilot

Revision ID: 20260808_0015
Revises: 20260806_0014
Create Date: 2026-08-08
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260808_0015"
down_revision = "20260806_0014"
branch_labels = None
depends_on = None


NEW_PUBLIC_TABLES = (
    "products",
    "inventory_movements",
    "inventory_transfers",
    "inventory_transfer_items",
    "waste_records",
)


def upgrade() -> None:
    bind = op.get_bind()

    with op.batch_alter_table("stores") as batch_op:
        batch_op.add_column(
            sa.Column("unit_type", sa.String(length=20), nullable=False, server_default="loja")
        )
        batch_op.create_index("ix_stores_unit_type", ["unit_type"], unique=False)

    bind.execute(
        sa.text(
            "insert into stores (name, unit_type, active, created_at) "
            "select cast(:name as varchar(160)), cast(:unit_type as varchar(20)), "
            "cast(:active as boolean), CURRENT_TIMESTAMP "
            "where not exists ("
            "select 1 from stores where name = cast(:name as varchar(160))"
            ")"
        ),
        {"name": "Fábrica Lia", "unit_type": "fabrica", "active": True},
    )
    bind.execute(
        sa.text("update stores set unit_type = :unit_type where name = :name"),
        {"name": "Fábrica Lia", "unit_type": "fabrica"},
    )

    op.create_table(
        "products",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("unit", sa.String(length=30), nullable=False, server_default="unidade"),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name", name="uq_products_name"),
    )
    op.create_index("ix_products_name", "products", ["name"], unique=True)

    bind.execute(
        sa.text(
            "insert into products (name, unit, active, created_at, updated_at) "
            "select distinct product_name, :unit, :active, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP "
            "from inventory_items"
        ),
        {"unit": "unidade", "active": True},
    )

    with op.batch_alter_table("inventory_items") as batch_op:
        batch_op.add_column(sa.Column("store_id", sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column("product_id", sa.Integer(), nullable=True))
        batch_op.add_column(
            sa.Column("unit_cost", sa.Numeric(precision=12, scale=4), nullable=False, server_default="0")
        )
        batch_op.add_column(sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()))
        batch_op.alter_column(
            "quantity",
            existing_type=sa.Integer(),
            type_=sa.Numeric(precision=12, scale=3),
            existing_nullable=False,
        )
        batch_op.create_foreign_key("fk_inventory_items_store_id", "stores", ["store_id"], ["id"])
        batch_op.create_foreign_key("fk_inventory_items_product_id", "products", ["product_id"], ["id"])
        batch_op.create_index("ix_inventory_items_store_id", ["store_id"], unique=False)
        batch_op.create_index("ix_inventory_items_product_id", ["product_id"], unique=False)

    bind.execute(
        sa.text(
            "update inventory_items set store_id = "
            "(select stores.id from stores where stores.name = inventory_items.store), "
            "product_id = (select products.id from products where products.name = inventory_items.product_name)"
        )
    )

    missing_links = bind.execute(
        sa.text("select count(*) from inventory_items where store_id is null or product_id is null")
    ).scalar_one()
    if missing_links:
        raise RuntimeError("Não foi possível vincular todos os saldos existentes a unidade e produto.")

    with op.batch_alter_table("inventory_items") as batch_op:
        batch_op.alter_column("store_id", existing_type=sa.Integer(), nullable=False)
        batch_op.alter_column("product_id", existing_type=sa.Integer(), nullable=False)
        batch_op.create_unique_constraint("uq_inventory_unit_product", ["store_id", "product_id"])
        batch_op.create_check_constraint("ck_inventory_items_quantity_nonnegative", "quantity >= 0")

    op.create_table(
        "inventory_transfers",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("source_store_id", sa.Integer(), nullable=False),
        sa.Column("destination_store_id", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=30), nullable=False, server_default="enviada"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("discrepancy_note", sa.Text(), nullable=True),
        sa.Column("sent_by_user_id", sa.Integer(), nullable=False),
        sa.Column("received_by_user_id", sa.Integer(), nullable=True),
        sa.Column("sent_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("received_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["source_store_id"], ["stores.id"]),
        sa.ForeignKeyConstraint(["destination_store_id"], ["stores.id"]),
        sa.ForeignKeyConstraint(["sent_by_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["received_by_user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    for column in (
        "source_store_id",
        "destination_store_id",
        "status",
        "sent_by_user_id",
        "received_by_user_id",
        "sent_at",
    ):
        op.create_index(f"ix_inventory_transfers_{column}", "inventory_transfers", [column])

    op.create_table(
        "inventory_movements",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("inventory_item_id", sa.Integer(), nullable=False),
        sa.Column("movement_type", sa.String(length=40), nullable=False),
        sa.Column("quantity_delta", sa.Numeric(precision=12, scale=3), nullable=False),
        sa.Column("quantity_before", sa.Numeric(precision=12, scale=3), nullable=False),
        sa.Column("quantity_after", sa.Numeric(precision=12, scale=3), nullable=False),
        sa.Column("unit_cost_snapshot", sa.Numeric(precision=12, scale=4), nullable=False, server_default="0"),
        sa.Column("reason", sa.String(length=240), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("transfer_id", sa.Integer(), nullable=True),
        sa.Column("created_by_user_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["inventory_item_id"], ["inventory_items.id"]),
        sa.ForeignKeyConstraint(["transfer_id"], ["inventory_transfers.id"]),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    for column in ("inventory_item_id", "movement_type", "transfer_id", "created_by_user_id", "created_at"):
        op.create_index(f"ix_inventory_movements_{column}", "inventory_movements", [column])

    bind.execute(
        sa.text(
            "insert into inventory_movements "
            "(inventory_item_id, movement_type, quantity_delta, quantity_before, quantity_after, "
            "unit_cost_snapshot, reason, created_by_user_id, created_at) "
            "select id, :movement_type, quantity, 0, quantity, unit_cost, :reason, "
            "created_by_user_id, created_at from inventory_items"
        ),
        {
            "movement_type": "saldo_inicial",
            "reason": "Saldo migrado do estoque anterior",
        },
    )

    op.create_table(
        "inventory_transfer_items",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("transfer_id", sa.Integer(), nullable=False),
        sa.Column("product_id", sa.Integer(), nullable=False),
        sa.Column("source_inventory_item_id", sa.Integer(), nullable=False),
        sa.Column("destination_inventory_item_id", sa.Integer(), nullable=True),
        sa.Column("quantity_sent", sa.Numeric(precision=12, scale=3), nullable=False),
        sa.Column("quantity_received", sa.Numeric(precision=12, scale=3), nullable=True),
        sa.Column("unit_cost_snapshot", sa.Numeric(precision=12, scale=4), nullable=False, server_default="0"),
        sa.ForeignKeyConstraint(["transfer_id"], ["inventory_transfers.id"]),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"]),
        sa.ForeignKeyConstraint(["source_inventory_item_id"], ["inventory_items.id"]),
        sa.ForeignKeyConstraint(["destination_inventory_item_id"], ["inventory_items.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    for column in (
        "transfer_id",
        "product_id",
        "source_inventory_item_id",
        "destination_inventory_item_id",
    ):
        op.create_index(f"ix_inventory_transfer_items_{column}", "inventory_transfer_items", [column])

    op.create_table(
        "waste_records",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("inventory_item_id", sa.Integer(), nullable=False),
        sa.Column("inventory_movement_id", sa.Integer(), nullable=False),
        sa.Column("store_id", sa.Integer(), nullable=False),
        sa.Column("product_id", sa.Integer(), nullable=False),
        sa.Column("quantity", sa.Numeric(precision=12, scale=3), nullable=False),
        sa.Column("reason", sa.String(length=40), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("unit_cost_snapshot", sa.Numeric(precision=12, scale=4), nullable=False, server_default="0"),
        sa.Column("total_cost", sa.Numeric(precision=14, scale=2), nullable=False, server_default="0"),
        sa.Column("created_by_user_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["inventory_item_id"], ["inventory_items.id"]),
        sa.ForeignKeyConstraint(["inventory_movement_id"], ["inventory_movements.id"]),
        sa.ForeignKeyConstraint(["store_id"], ["stores.id"]),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"]),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("inventory_movement_id", name="uq_waste_records_inventory_movement_id"),
    )
    for column in (
        "inventory_item_id",
        "inventory_movement_id",
        "store_id",
        "product_id",
        "reason",
        "created_by_user_id",
        "created_at",
    ):
        op.create_index(f"ix_waste_records_{column}", "waste_records", [column])

    if bind.dialect.name == "postgresql":
        for table_name in NEW_PUBLIC_TABLES:
            op.execute(f'ALTER TABLE public."{table_name}" ENABLE ROW LEVEL SECURITY')
            op.execute(f'REVOKE ALL PRIVILEGES ON TABLE public."{table_name}" FROM PUBLIC')
            op.execute(
                f'REVOKE ALL PRIVILEGES ON TABLE public."{table_name}" '
                "FROM anon, authenticated, service_role"
            )
        op.execute(
            "REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public "
            "FROM PUBLIC, anon, authenticated, service_role"
        )


def downgrade() -> None:
    raise RuntimeError(
        "Esta migration preserva o histórico de estoque e não possui downgrade destrutivo; "
        "restaure um backup anterior se a reversão for indispensável."
    )
