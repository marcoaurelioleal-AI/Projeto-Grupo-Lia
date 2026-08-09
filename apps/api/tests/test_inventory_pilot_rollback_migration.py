from __future__ import annotations

import os
from pathlib import Path
import sqlite3
import subprocess
import sys


PROJECT_ROOT = Path(__file__).resolve().parents[3]


def _run_alembic(database_url: str, revision: str) -> None:
    environment = os.environ.copy()
    environment["DATABASE_URL"] = database_url
    environment["PYTHONPATH"] = str(PROJECT_ROOT)
    subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", revision],
        cwd=PROJECT_ROOT,
        env=environment,
        check=True,
        capture_output=True,
        text=True,
    )


def test_rollback_restores_pre_pilot_schema_and_data(tmp_path: Path) -> None:
    database_path = tmp_path / "inventory-pilot-rollback.db"
    database_url = f"sqlite:///{database_path.as_posix()}"
    _run_alembic(database_url, "20260806_0014")

    with sqlite3.connect(database_path) as connection:
        connection.execute(
            "insert into users "
            "(id, username, name, role, password_hash, active, created_at, store_id) "
            "values (1, 'admin', 'Administrador', 'admin', 'hash', 1, CURRENT_TIMESTAMP, null)"
        )
        connection.execute(
            "insert into inventory_items "
            "(id, store, product_name, quantity, created_by_user_id, created_at, updated_at) "
            "values (1, 'Lia Burger', 'Farinha', 10, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
        )
        connection.commit()

    _run_alembic(database_url, "20260808_0015")

    with sqlite3.connect(database_path) as connection:
        connection.execute(
            "insert into users "
            "(id, username, name, role, password_hash, active, created_at, store_id) "
            "values (2, 'lideranca-transicao', 'Liderança', 'lideranca', 'hash', 1, "
            "CURRENT_TIMESTAMP, null)"
        )
        connection.commit()

    _run_alembic(database_url, "head")

    with sqlite3.connect(database_path) as connection:
        revision = connection.execute("select version_num from alembic_version").fetchone()[0]
        store_columns = {
            row[1] for row in connection.execute("pragma table_info('stores')").fetchall()
        }
        inventory_columns = {
            row[1]: row[2]
            for row in connection.execute("pragma table_info('inventory_items')").fetchall()
        }
        tables = {
            row[0]
            for row in connection.execute(
                "select name from sqlite_master where type = 'table'"
            ).fetchall()
        }
        stores = connection.execute(
            "select name, active from stores order by id"
        ).fetchall()
        users = connection.execute("select id, role from users order by id").fetchall()
        inventory = connection.execute(
            "select id, store, product_name, quantity, created_by_user_id "
            "from inventory_items"
        ).fetchall()

    assert revision == "20260809_0016"
    assert store_columns == {"id", "name", "active", "created_at"}
    assert inventory_columns == {
        "id": "INTEGER",
        "store": "VARCHAR(80)",
        "product_name": "VARCHAR(160)",
        "quantity": "INTEGER",
        "created_by_user_id": "INTEGER",
        "created_at": "DATETIME",
        "updated_at": "DATETIME",
    }
    assert not {
        "products",
        "inventory_movements",
        "inventory_transfers",
        "inventory_transfer_items",
        "waste_records",
    } & tables
    assert stores == [
        ("Grupo Lia", 0),
        ("Lia Burger", 1),
        ("Lia Pizzas", 1),
        ("Lia Salgados", 1),
    ]
    assert users == [(1, "admin")]
    assert inventory == [(1, "Lia Burger", "Farinha", 10, 1)]
