from __future__ import annotations

from collections.abc import Callable

from fastapi.testclient import TestClient


def _create_user(
    client: TestClient,
    admin_headers: dict[str, str],
    *,
    username: str,
    role: str,
    store_id: int | None,
) -> None:
    response = client.post(
        "/api/admin/users",
        headers=admin_headers,
        json={
            "username": username,
            "name": username.replace("_", " ").title(),
            "role": role,
            "store_id": store_id,
            "password": "senha123",
        },
    )
    assert response.status_code == 200


def _store_id(client: TestClient, admin_headers: dict[str, str], name: str) -> int:
    stores = client.get("/api/admin/stores", headers=admin_headers)
    assert stores.status_code == 200
    return next(store["id"] for store in stores.json() if store["name"] == name)


def test_factory_is_seeded_as_an_operational_unit(
    client: TestClient,
    admin_headers: dict[str, str],
) -> None:
    stores = client.get("/api/admin/stores", headers=admin_headers)

    assert stores.status_code == 200
    factory = next(store for store in stores.json() if store["name"] == "Fábrica Lia")
    assert factory["unit_type"] == "fabrica"


def test_inventory_movements_change_balance_and_hide_costs_from_operation(
    client: TestClient,
    admin_headers: dict[str, str],
    login_headers: Callable[[str, str], dict[str, str]],
) -> None:
    factory_id = _store_id(client, admin_headers, "Fábrica Lia")
    _create_user(
        client,
        admin_headers,
        username="operacao_fabrica_mov",
        role="operacao",
        store_id=factory_id,
    )
    operator = login_headers("operacao_fabrica_mov", "senha123")

    product = client.post(
        "/api/inventory/products",
        headers=admin_headers,
        json={"name": "Hambúrguer piloto movimentos", "unit": "unidade"},
    )
    assert product.status_code == 200

    balance = client.post(
        "/api/inventory/balances",
        headers=admin_headers,
        json={
            "store_id": factory_id,
            "product_id": product.json()["id"],
            "quantity": "20.000",
            "unit_cost": "2.5000",
        },
    )
    assert balance.status_code == 200
    balance_id = balance.json()["id"]

    movement = client.post(
        f"/api/inventory/{balance_id}/movements",
        headers=operator,
        json={"movement_type": "producao", "quantity": "5.000", "reason": "produção do turno"},
    )
    assert movement.status_code == 200
    assert movement.json()["quantity_before"] == 20.0
    assert movement.json()["quantity_after"] == 25.0
    assert "unit_cost_snapshot" not in movement.json()

    inventory = client.get("/api/inventory", headers=operator)
    assert inventory.status_code == 200
    item = next(item for item in inventory.json() if item["id"] == balance_id)
    assert item["quantity"] == 25.0
    assert "unit_cost" not in item

    silent_overwrite = client.patch(
        f"/api/inventory/{balance_id}",
        headers=operator,
        json={"quantity": "99.000"},
    )
    assert silent_overwrite.status_code in {400, 405, 422}

    insufficient = client.post(
        f"/api/inventory/{balance_id}/movements",
        headers=operator,
        json={"movement_type": "saida", "quantity": "100.000", "reason": "consumo impossível"},
    )
    assert insufficient.status_code == 409


def test_transfer_receipt_discrepancy_and_waste_are_auditable(
    client: TestClient,
    admin_headers: dict[str, str],
    login_headers: Callable[[str, str], dict[str, str]],
) -> None:
    factory_id = _store_id(client, admin_headers, "Fábrica Lia")
    burger_id = _store_id(client, admin_headers, "Lia Burger")
    _create_user(
        client,
        admin_headers,
        username="operacao_fabrica_transf",
        role="operacao",
        store_id=factory_id,
    )
    _create_user(
        client,
        admin_headers,
        username="operacao_burger_transf",
        role="operacao",
        store_id=burger_id,
    )
    _create_user(
        client,
        admin_headers,
        username="gerente_burger_transf",
        role="gerente",
        store_id=burger_id,
    )
    factory_operator = login_headers("operacao_fabrica_transf", "senha123")
    burger_operator = login_headers("operacao_burger_transf", "senha123")
    burger_manager = login_headers("gerente_burger_transf", "senha123")

    product = client.post(
        "/api/inventory/products",
        headers=admin_headers,
        json={"name": "Salgado piloto transferência", "unit": "unidade"},
    ).json()
    source = client.post(
        "/api/inventory/balances",
        headers=admin_headers,
        json={
            "store_id": factory_id,
            "product_id": product["id"],
            "quantity": "10.000",
            "unit_cost": "2.5000",
        },
    ).json()

    transfer = client.post(
        "/api/transfers",
        headers=factory_operator,
        json={
            "destination_store_id": burger_id,
            "items": [{"product_id": product["id"], "quantity": "6.000"}],
            "notes": "Envio do piloto",
        },
    )
    assert transfer.status_code == 200
    assert transfer.json()["status"] == "enviada"

    source_after = client.get("/api/inventory", headers=factory_operator).json()
    assert next(item for item in source_after if item["id"] == source["id"])["quantity"] == 4.0

    received = client.post(
        f"/api/transfers/{transfer.json()['id']}/receive",
        headers=burger_operator,
        json={
            "items": [{"transfer_item_id": transfer.json()["items"][0]["id"], "quantity_received": "5.000"}],
            "discrepancy_note": "Uma unidade não chegou à loja",
        },
    )
    assert received.status_code == 200
    assert received.json()["status"] == "divergente"
    assert received.json()["items"][0]["quantity_received"] == 5.0

    duplicate_receipt = client.post(
        f"/api/transfers/{transfer.json()['id']}/receive",
        headers=burger_operator,
        json={
            "items": [{"transfer_item_id": transfer.json()["items"][0]["id"], "quantity_received": "5.000"}],
            "discrepancy_note": "Tentativa repetida",
        },
    )
    assert duplicate_receipt.status_code == 409

    burger_inventory = client.get("/api/inventory", headers=burger_operator).json()
    destination = next(item for item in burger_inventory if item["product_id"] == product["id"])
    assert destination["quantity"] == 5.0

    waste = client.post(
        "/api/waste",
        headers=burger_operator,
        json={
            "inventory_item_id": destination["id"],
            "quantity": "2.000",
            "reason": "erro_preparo",
            "notes": "Produto fora do padrão",
        },
    )
    assert waste.status_code == 200
    assert waste.json()["quantity"] == 2.0
    assert "total_cost" not in waste.json()

    summary = client.get("/api/waste/summary", headers=burger_manager)
    assert summary.status_code == 200
    assert summary.json()["total_quantity"] == 2.0
    assert summary.json()["total_cost"] == 5.0

    movement_history = client.get(
        f"/api/inventory/{destination['id']}/movements",
        headers=burger_manager,
    )
    assert movement_history.status_code == 200
    assert [item["movement_type"] for item in movement_history.json()] == ["perda", "transferencia_entrada"]


def test_inventory_rbac_enforces_unit_scope_costs_and_read_only_auditing(
    client: TestClient,
    admin_headers: dict[str, str],
    login_headers: Callable[[str, str], dict[str, str]],
) -> None:
    factory_id = _store_id(client, admin_headers, "Fábrica Lia")
    burger_id = _store_id(client, admin_headers, "Lia Burger")
    for username, role, store_id in (
        ("operacao_escopo_burger", "operacao", burger_id),
        ("gerente_escopo_burger", "gerente", burger_id),
        ("auditor_escopo_global", "auditor", None),
        ("lideranca_escopo_global", "lideranca", None),
    ):
        _create_user(client, admin_headers, username=username, role=role, store_id=store_id)

    product = client.post(
        "/api/inventory/products",
        headers=admin_headers,
        json={"name": "Produto piloto RBAC", "unit": "kg"},
    ).json()
    factory_balance = client.post(
        "/api/inventory/balances",
        headers=admin_headers,
        json={"store_id": factory_id, "product_id": product["id"], "quantity": 8, "unit_cost": 4.25},
    ).json()
    burger_balance = client.post(
        "/api/inventory/balances",
        headers=admin_headers,
        json={"store_id": burger_id, "product_id": product["id"], "quantity": 3, "unit_cost": 5},
    ).json()

    operation = login_headers("operacao_escopo_burger", "senha123")
    manager = login_headers("gerente_escopo_burger", "senha123")
    auditor = login_headers("auditor_escopo_global", "senha123")
    leadership = login_headers("lideranca_escopo_global", "senha123")

    assert client.get(f"/api/inventory?store_id={factory_id}", headers=operation).status_code == 403
    assert client.post(
        f"/api/inventory/{factory_balance['id']}/movements",
        headers=operation,
        json={"movement_type": "saida", "quantity": 1, "reason": "tentativa fora do escopo"},
    ).status_code == 403
    operation_items = client.get("/api/inventory", headers=operation).json()
    assert burger_balance["id"] in {item["id"] for item in operation_items}
    assert all(item["store_id"] == burger_id for item in operation_items)
    assert all("unit_cost" not in item for item in operation_items)
    assert {unit["name"] for unit in client.get("/api/inventory/units", headers=operation).json()} >= {
        "Fábrica Lia",
        "Lia Burger",
    }

    assert client.get(f"/api/inventory?store_id={factory_id}", headers=manager).status_code == 403
    manager_cost = client.post(
        f"/api/inventory/{burger_balance['id']}/cost",
        headers=manager,
        json={"unit_cost": 5.5, "reason": "Custo validado pelo gerente"},
    )
    assert manager_cost.status_code == 200
    assert manager_cost.json()["movement_type"] == "custo_atualizado"
    assert manager_cost.json()["unit_cost_snapshot"] == 5.5

    auditor_items = client.get("/api/inventory", headers=auditor)
    assert auditor_items.status_code == 200
    assert len(auditor_items.json()) >= 2
    assert all("unit_cost" not in item for item in auditor_items.json())
    assert client.get(
        f"/api/inventory/{burger_balance['id']}/movements", headers=auditor
    ).status_code == 200
    assert client.post(
        f"/api/inventory/{burger_balance['id']}/movements",
        headers=auditor,
        json={"movement_type": "saida", "quantity": 1, "reason": "auditor não altera"},
    ).status_code == 403

    leadership_items = client.get("/api/inventory", headers=leadership).json()
    assert all("unit_cost" in item for item in leadership_items)
    assert {unit["name"] for unit in client.get("/api/inventory/units", headers=leadership).json()} >= {
        "Fábrica Lia",
        "Lia Burger",
    }
    renamed = client.patch(
        f"/api/inventory/products/{product['id']}",
        headers=leadership,
        json={"name": "Produto piloto RBAC validado", "unit": "kg"},
    )
    assert renamed.status_code == 200
    assert renamed.json()["name"] == "Produto piloto RBAC validado"
