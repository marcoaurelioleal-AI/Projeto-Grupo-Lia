from __future__ import annotations

from datetime import date

from fastapi.testclient import TestClient


def test_report_summary_returns_operational_indicators(client: TestClient, admin_headers: dict[str, str]) -> None:
    today = date.today().isoformat()

    response = client.get(
        f"/api/reports/summary?start_date={today}&end_date={today}",
        headers=admin_headers,
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["total_checklists"] >= 0
    assert payload["total_items"] >= payload["completed_items"]
    assert "aberta" in payload["incidents_by_status"] or payload["total_incidents"] == 0


def test_executive_dashboard_shows_p4_product_metrics(client: TestClient, admin_headers: dict[str, str]) -> None:
    runs = client.get("/api/checklists?store=Lia Burger", headers=admin_headers).json()
    item_id = runs[0]["items"][0]["id"]
    uploaded = client.post(
        f"/api/checklists/items/{item_id}/evidences",
        headers=admin_headers,
        files={"file": ("balcao.png", b"fake-image", "image/png")},
    )
    assert uploaded.status_code == 200

    incident = client.post(
        "/api/incidents",
        headers=admin_headers,
        json={
            "store": "Lia Burger",
            "category": "equipamento",
            "severity": "critica",
            "description": "Fritadeira parada durante o pico.",
        },
    )
    assert incident.status_code == 200

    dashboard = client.get("/api/reports/executive", headers=admin_headers)
    assert dashboard.status_code == 200
    payload = dashboard.json()

    assert payload["summary_7d"]["pending_tasks"] >= 0
    assert payload["summary_30d"]["total_checklists"] >= payload["summary_7d"]["total_checklists"]
    assert any(item["store"] == "Lia Burger" for item in payload["store_rankings"])
    assert any(item["severity"] == "critica" for item in payload["critical_incidents"])
    assert any(item["original_filename"] == "balcao.png" for item in payload["recent_evidences"])
