from __future__ import annotations

import os

os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["LIA_ADMIN_USER"] = "admin"
os.environ["LIA_ADMIN_PASSWORD"] = "admin123"
os.environ.pop("GEMINI_API_KEY", None)
os.environ.pop("CHAVE_API", None)

from fastapi.testclient import TestClient  # noqa: E402

from apps.api.app.main import app  # noqa: E402


def auth_headers(client: TestClient) -> dict[str, str]:
    response = client.post("/auth/login", json={"username": "admin", "password": "admin123"})
    assert response.status_code == 200
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_login_and_me() -> None:
    with TestClient(app) as client:
        headers = auth_headers(client)
        response = client.get("/auth/me", headers=headers)
        assert response.status_code == 200
        assert response.json()["role"] == "admin"


def test_manuals_and_checklists() -> None:
    with TestClient(app) as client:
        headers = auth_headers(client)
        manuals = client.get("/manuals", headers=headers)
        assert manuals.status_code == 200
        assert {manual["unit"] for manual in manuals.json()} == {"Lia Burguer", "Lia Pizza", "Lia Salgados"}

        checklists = client.get("/checklists", headers=headers)
        assert checklists.status_code == 200
        runs = checklists.json()
        assert len(runs) == 3
        first_item = runs[0]["items"][0]
        updated = client.patch(
            f"/checklists/{runs[0]['id']}/items",
            headers=headers,
            json={"item_id": first_item["id"], "done": True},
        )
        assert updated.status_code == 200
        assert updated.json()["completed"] == 1


def test_ai_offline_mode() -> None:
    with TestClient(app) as client:
        headers = auth_headers(client)
        response = client.post(
            "/ai/chat",
            headers=headers,
            json={"messages": [{"role": "user", "content": "Qual temperatura da chapa?"}]},
        )
        assert response.status_code == 200
        assert response.json()["mode"] in {"offline", "error"}
