from __future__ import annotations

from collections.abc import Callable

from fastapi.testclient import TestClient


def test_leadership_area_uses_individual_main_login_and_records_employee_feedback(
    client: TestClient,
    admin_headers: dict[str, str],
    login_headers: Callable[[str, str], dict[str, str]],
) -> None:
    client.post("/api/auth/logout")
    no_token = client.get("/api/leadership/employees")
    assert no_token.status_code == 401

    created = client.post(
        "/api/admin/users",
        headers=admin_headers,
        json={
            "username": "lider_individual",
            "name": "Líder Individual",
            "role": "lideranca",
            "store_id": None,
            "password": "senha123",
        },
    )
    assert created.status_code == 200
    leadership_headers = login_headers("lider_individual", "senha123")

    me = client.get("/api/leadership/me", headers=leadership_headers)
    assert me.status_code == 200
    assert me.json()["role"] == "lideranca"
    assert me.json()["username"] == "lider_individual"

    executive = client.get("/api/reports/executive", headers=leadership_headers)
    assert executive.status_code == 200
    assert set(executive.json()["visible_stores"]) >= {"Lia Burger", "Lia Pizzas", "Lia Salgados", "Fábrica Lia"}

    employee = client.post(
        "/api/leadership/employees",
        headers=leadership_headers,
        json={"name": "Funcionário Teste", "store": "Lia Burger", "position": "Atendente"},
    )
    assert employee.status_code == 200
    employee_payload = employee.json()
    assert employee_payload["name"] == "Funcionário Teste"
    assert employee_payload["record_count"] == 0

    updated_employee = client.patch(
        f"/api/leadership/employees/{employee_payload['id']}",
        headers=leadership_headers,
        json={"position": "Operador de caixa"},
    )
    assert updated_employee.status_code == 200
    assert updated_employee.json()["position"] == "Operador de caixa"

    record = client.post(
        f"/api/leadership/employees/{employee_payload['id']}/records",
        headers=leadership_headers,
        json={
            "record_type": "advertencia",
            "description": "Advertência aplicada por quebra de procedimento.",
            "applied_at": "2026-05-16",
        },
    )
    assert record.status_code == 200
    assert record.json()["record_type"] == "advertencia"
    assert record.json()["employee_name"] == "Funcionário Teste"

    records = client.get("/api/leadership/records", headers=leadership_headers)
    assert records.status_code == 200
    assert any(item["employee_name"] == "Funcionário Teste" for item in records.json())

    employee_records = client.get(
        f"/api/leadership/employees/{employee_payload['id']}/records",
        headers=leadership_headers,
    )
    assert employee_records.status_code == 200
    assert len(employee_records.json()) == 1
    assert employee_records.json()[0]["description"] == "Advertência aplicada por quebra de procedimento."

    employees_after_record = client.get("/api/leadership/employees", headers=leadership_headers)
    assert employees_after_record.status_code == 200
    saved_employee = next(item for item in employees_after_record.json() if item["id"] == employee_payload["id"])
    assert saved_employee["record_count"] == 1
    assert saved_employee["position"] == "Operador de caixa"

    burger_store = next(
        store for store in client.get("/api/admin/stores", headers=admin_headers).json() if store["name"] == "Lia Burger"
    )
    operation_user = client.post(
        "/api/admin/users",
        headers=admin_headers,
        json={
            "username": "operacao_sem_lideranca",
            "name": "Operação sem liderança",
            "role": "operacao",
            "store_id": burger_store["id"],
            "password": "senha123",
        },
    )
    assert operation_user.status_code == 200
    operation_headers = login_headers("operacao_sem_lideranca", "senha123")
    assert client.get("/api/leadership/employees", headers=operation_headers).status_code == 403
