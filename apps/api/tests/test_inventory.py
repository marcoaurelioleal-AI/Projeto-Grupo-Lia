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
