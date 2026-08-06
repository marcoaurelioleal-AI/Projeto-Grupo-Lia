"""remove group brand from operational stores

Revision ID: 20260806_0014
Revises: 20260806_0013
Create Date: 2026-08-06
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260806_0014"
down_revision = "20260806_0013"
branch_labels = None
depends_on = None


GROUP_BRAND_NAME = "Grupo Lia"
DEFAULT_STORE_NAME = "Lia Burger"
OLD_PIZZA_STORE_NAME = "Lia Pizza"
NEW_PIZZA_STORE_NAME = "Lia Pizzas"
STORE_TABLE_COLUMNS = (
    ("leadership_employees", "store"),
    ("audit_logs", "store"),
    ("manuals", "unit"),
    ("checklist_templates", "store"),
    ("checklist_runs", "store"),
    ("operational_incidents", "store"),
    ("ai_chat_sessions", "store"),
    ("ai_chat_sessions", "unit"),
    ("ai_knowledge_chunks", "unit"),
    ("inventory_items", "store"),
)


def upgrade() -> None:
    _rename_store(OLD_PIZZA_STORE_NAME, NEW_PIZZA_STORE_NAME)
    connection = op.get_bind()
    inspector = sa.inspect(connection)
    tables = set(inspector.get_table_names())

    if "stores" in tables:
        connection.execute(
            sa.text("update stores set active = :active where name = :name"),
            {"active": False, "name": GROUP_BRAND_NAME},
        )

    if "checklist_templates" in tables:
        connection.execute(
            sa.text("update checklist_templates set store = :store where store = :group_name"),
            {"store": DEFAULT_STORE_NAME, "group_name": GROUP_BRAND_NAME},
        )


def downgrade() -> None:
    _rename_store(NEW_PIZZA_STORE_NAME, OLD_PIZZA_STORE_NAME)
    connection = op.get_bind()
    inspector = sa.inspect(connection)
    tables = set(inspector.get_table_names())

    if "stores" in tables:
        connection.execute(
            sa.text("update stores set active = :active where name = :name"),
            {"active": True, "name": GROUP_BRAND_NAME},
        )


def _rename_store(old_name: str, new_name: str) -> None:
    connection = op.get_bind()
    inspector = sa.inspect(connection)
    tables = set(inspector.get_table_names())

    if "stores" in tables:
        old_store_id = connection.execute(
            sa.text("select id from stores where name = :name"), {"name": old_name}
        ).scalar()
        new_store_id = connection.execute(
            sa.text("select id from stores where name = :name"), {"name": new_name}
        ).scalar()

        if old_store_id and new_store_id:
            if "users" in tables:
                connection.execute(
                    sa.text("update users set store_id = :new_id where store_id = :old_id"),
                    {"new_id": new_store_id, "old_id": old_store_id},
                )
            connection.execute(sa.text("delete from stores where id = :id"), {"id": old_store_id})
        elif old_store_id:
            connection.execute(
                sa.text("update stores set name = :new_name where id = :id"),
                {"new_name": new_name, "id": old_store_id},
            )

    for table_name, column_name in STORE_TABLE_COLUMNS:
        if table_name not in tables:
            continue
        connection.execute(
            sa.text(f"update {table_name} set {column_name} = :new_name where {column_name} = :old_name"),
            {"new_name": new_name, "old_name": old_name},
        )
