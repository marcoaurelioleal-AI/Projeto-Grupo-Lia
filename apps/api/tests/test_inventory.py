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
    assert payload["unit"] == "un"

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


def test_inventory_accepts_fractional_quantities_and_measurement_units(
    client: TestClient,
    admin_headers: dict[str, str],
) -> None:
    created = client.post(
        "/api/inventory",
        headers=admin_headers,
        json={
            "store": "Lia Pizzas",
            "product_name": "Farinha de trigo",
            "quantity": 12.5,
            "unit": "kg",
        },
    )

    assert created.status_code == 200
    payload = created.json()
    assert payload["quantity"] == 12.5
    assert payload["unit"] == "kg"

    updated = client.patch(
        f"/api/inventory/{payload['id']}",
        headers=admin_headers,
        json={"quantity": 10.75},
    )

    assert updated.status_code == 200
    assert updated.json()["quantity"] == 10.75
    assert updated.json()["unit"] == "kg"


def test_inventory_rejects_unknown_measurement_unit(
    client: TestClient,
    admin_headers: dict[str, str],
) -> None:
    response = client.post(
        "/api/inventory",
        headers=admin_headers,
        json={
            "store": "Lia Salgados",
            "product_name": "Oleo",
            "quantity": 5,
            "unit": "caixa",
        },
    )

    assert response.status_code == 422


def test_inventory_allows_permanent_product_deletion(
    client: TestClient,
    admin_headers: dict[str, str],
) -> None:
    created = client.post(
        "/api/inventory",
        headers=admin_headers,
        json={"store": "Lia Burger", "product_name": "Produto para excluir", "quantity": 3},
    )
    item_id = created.json()["id"]

    deleted = client.delete(f"/api/inventory/{item_id}", headers=admin_headers)

    assert deleted.status_code == 204
    listed = client.get("/api/inventory?store=Lia Burger", headers=admin_headers)
    assert all(item["id"] != item_id for item in listed.json())


def test_inventory_delete_returns_not_found(
    client: TestClient,
    admin_headers: dict[str, str],
) -> None:
    response = client.delete("/api/inventory/999999", headers=admin_headers)

    assert response.status_code == 404
    assert response.json()["detail"] == "Produto de estoque não encontrado"


def test_inventory_prevents_deleting_product_from_another_store(
    client: TestClient,
    admin_headers: dict[str, str],
    login_headers: Callable[[str, str], dict[str, str]],
) -> None:
    stores = client.get("/api/admin/stores", headers=admin_headers).json()
    burger_store = next(store for store in stores if store["name"] == "Lia Burger")
    created_user = client.post(
        "/api/admin/users",
        headers=admin_headers,
        json={
            "username": "estoque_burger",
            "name": "Estoque Burger",
            "role": "operacao",
            "store_id": burger_store["id"],
            "password": "senha123",
        },
    )
    assert created_user.status_code == 200
    operator_headers = login_headers("estoque_burger", "senha123")
    product = client.post(
        "/api/inventory",
        headers=admin_headers,
        json={"store": "Lia Pizzas", "product_name": "Produto da pizzaria", "quantity": 4},
    ).json()

    denied = client.delete(f"/api/inventory/{product['id']}", headers=operator_headers)

    assert denied.status_code == 403
    listed = client.get("/api/inventory?store=Lia Pizzas", headers=admin_headers).json()
    assert any(item["id"] == product["id"] for item in listed)
