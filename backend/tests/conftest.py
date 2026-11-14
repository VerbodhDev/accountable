from pathlib import Path

import pytest
from accountable.main import create_app
from fastapi.testclient import TestClient


@pytest.fixture
def api(tmp_path, monkeypatch):
    monkeypatch.delenv("ACCOUNTABLE_DB", raising=False)
    monkeypatch.delenv("ACCOUNTABLE_SHARED", raising=False)
    path = tmp_path / "test.db"
    app = create_app(path)
    with TestClient(app) as client:
        signed = client.post(
            "/api/session",
            json={"email": "alex.rivera@example.com", "password": "local-only"},
        )
        assert signed.status_code == 200
        client.headers["Authorization"] = f"Bearer {signed.json()['token']}"
        yield client, path


def owner_db() -> Path:
    return Path("data/accountable.db")
