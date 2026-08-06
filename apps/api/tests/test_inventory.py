from __future__ import annotations

from collections.abc import Callable

from fastapi.testclient import TestClient


def test_inventory_allows_product_registration_and_quantity_update(
    client: TestClient,
    admin_headers: dict[str, str],
) -> None:
    created = client.post(
        "/api/inventory",
        headers=admin_headers,
        json={"store": "Lia Burger", "product_name": "Queijo prato", "quantity": 12},
    )
    assert created.status_code == 200
    payload = created.json()
    assert payload["store"] == "Lia Burger"
    assert payload["product_name"] == "Queijo prato"
    assert payload["quantity"] == 12

    listed = client.get("/api/inventory?store=Lia Burger", headers=admin_headers)
    assert listed.status_code == 200
    assert any(item["product_name"] == "Queijo prato" for item in listed.json())

    updated = client.patch(
        f"/api/inventory/{payload['id']}",
        headers=admin_headers,
        json={"quantity": 18},
    )
    assert updated.status_code == 200
    assert updated.json()["quantity"] == 18

    upserted = client.post(
        "/api/inventory",
        headers=admin_headers,
        json={"store": "Lia Burger", "product_name": "Queijo prato", "quantity": 20},
    )
    assert upserted.status_code == 200
    assert upserted.json()["id"] == payload["id"]
    assert upserted.json()["quantity"] == 20


def test_inventory_returns_utc_timestamps_and_allows_product_deletion(
    client: TestClient,
    admin_headers: dict[str, str],
) -> None:
    created = client.post(
        "/api/inventory",
        headers=admin_headers,
        json={"store": "Lia Pizzas", "product_name": "Caixa de pizza", "quantity": 30},
    )
    assert created.status_code == 200
    payload = created.json()
    assert payload["updated_at"].endswith("Z")

    deleted = client.delete(f"/api/inventory/{payload['id']}", headers=admin_headers)
    assert deleted.status_code == 200
    assert deleted.json()["id"] == payload["id"]

    listed = client.get("/api/inventory?store=Lia Pizzas", headers=admin_headers)
    assert listed.status_code == 200
    assert all(item["id"] != payload["id"] for item in listed.json())


def test_inventory_deletion_returns_not_found_for_unknown_product(
    client: TestClient,
    admin_headers: dict[str, str],
) -> None:
    response = client.delete("/api/inventory/999999", headers=admin_headers)

    assert response.status_code == 404
    assert response.json()["detail"] == "Produto de estoque não encontrado"


def test_inventory_deletion_is_restricted_to_the_users_store(
    client: TestClient,
    admin_headers: dict[str, str],
    login_headers: Callable[[str, str], dict[str, str]],
) -> None:
    store_a = client.post("/api/admin/stores", headers=admin_headers, json={"name": "Lia Estoque A"}).json()
    store_b = client.post("/api/admin/stores", headers=admin_headers, json={"name": "Lia Estoque B"}).json()
    created_user = client.post(
        "/api/admin/users",
        headers=admin_headers,
        json={
            "username": "operador_estoque_b",
            "name": "Operador Estoque B",
            "role": "operacao",
            "store_id": store_b["id"],
            "password": "senha123",
        },
    )
    assert created_user.status_code == 200

    created_item = client.post(
        "/api/inventory",
        headers=admin_headers,
        json={"store": store_a["name"], "product_name": "Produto restrito", "quantity": 4},
    ).json()
    operator_headers = login_headers("operador_estoque_b", "senha123")

    denied = client.delete(f"/api/inventory/{created_item['id']}", headers=operator_headers)

    assert denied.status_code == 403
