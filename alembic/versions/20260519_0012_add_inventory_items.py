"""add inventory items

Revision ID: 20260519_0012
Revises: 20260519_0011
Create Date: 2026-06-28
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260519_0012"
down_revision = "20260519_0011"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "inventory_items",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("store", sa.String(length=80), nullable=False),
        sa.Column("product_name", sa.String(length=160), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("created_by_user_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("store", "product_name", name="uq_inventory_store_product"),
    )
    op.create_index(op.f("ix_inventory_items_store"), "inventory_items", ["store"], unique=False)
    op.create_index(op.f("ix_inventory_items_product_name"), "inventory_items", ["product_name"], unique=False)
    op.create_index(
        op.f("ix_inventory_items_created_by_user_id"),
        "inventory_items",
        ["created_by_user_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_inventory_items_created_by_user_id"), table_name="inventory_items")
    op.drop_index(op.f("ix_inventory_items_product_name"), table_name="inventory_items")
    op.drop_index(op.f("ix_inventory_items_store"), table_name="inventory_items")
    op.drop_table("inventory_items")
