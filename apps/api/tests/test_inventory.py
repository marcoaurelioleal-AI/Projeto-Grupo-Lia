from __future__ import annotations

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
