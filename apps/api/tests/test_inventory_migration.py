from __future__ import annotations

import os
from pathlib import Path
import sqlite3
import subprocess
import sys


PROJECT_ROOT = Path(__file__).resolve().parents[3]
INVENTORY_MIGRATION = PROJECT_ROOT / "alembic" / "versions" / "20260808_0015_inventory_pilot.py"


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


def test_sqlite_migration_preserves_balance_and_creates_initial_movement(tmp_path: Path) -> None:
    database_path = tmp_path / "inventory-pilot.db"
    database_url = f"sqlite:///{database_path.as_posix()}"
    _run_alembic(database_url, "20260806_0014")

    with sqlite3.connect(database_path) as connection:
        burger_store_id = connection.execute(
            "select id from stores where name = 'Lia Burger'"
        ).fetchone()[0]
        connection.execute(
            "insert into users "
            "(id, username, name, role, password_hash, active, created_at, store_id) "
            "values (1, 'gestor', 'Gestor', 'gerente', 'hash', 1, CURRENT_TIMESTAMP, null)"
        )
        connection.execute(
            "insert into inventory_items "
            "(id, store, product_name, quantity, created_by_user_id, created_at, updated_at) "
            "values (1, 'Lia Burger', 'Carne 160g', 17, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
        )
        connection.commit()

    _run_alembic(database_url, "head")

    with sqlite3.connect(database_path) as connection:
        factory = connection.execute(
            "select unit_type from stores where name = 'Fábrica Lia'"
        ).fetchone()
        product = connection.execute(
            "select id, unit from products where name = 'Carne 160g'"
        ).fetchone()
        balance = connection.execute(
            "select store_id, product_id, quantity, unit_cost from inventory_items where id = 1"
        ).fetchone()
        movement = connection.execute(
            "select movement_type, quantity_delta, quantity_before, quantity_after, reason "
            "from inventory_movements where inventory_item_id = 1"
        ).fetchone()

    assert factory == ("fabrica",)
    assert product is not None
    assert product[1] == "unidade"
    assert balance == (burger_store_id, product[0], 17, 0)
    assert movement == (
        "saldo_inicial",
        17,
        0,
        17,
        "Saldo migrado do estoque anterior",
    )

    with sqlite3.connect(database_path) as connection:
        try:
            connection.execute("update inventory_items set quantity = -1 where id = 1")
        except sqlite3.IntegrityError:
            pass
        else:
            raise AssertionError("A restrição do banco permitiu saldo negativo")


def test_factory_seed_casts_reused_parameters_for_postgresql() -> None:
    migration_source = INVENTORY_MIGRATION.read_text(encoding="utf-8")

    assert migration_source.count("cast(:name as varchar(160))") == 2
    assert "cast(:unit_type as varchar(20))" in migration_source
    assert "cast(:active as boolean)" in migration_source
