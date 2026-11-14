from pathlib import Path

import pytest
from accountable.main import create_app
from fastapi.testclient import TestClient


@pytest.fixture
def api(tmp_path, monkeypatch):
    monkeypatch.delenv("ACCOUNTABLE_DB", raising=False)
    path = tmp_path / "test.db"
    app = create_app(path)
    with TestClient(app) as client:
        yield client, path


def owner_db() -> Path:
    return Path("data/accountable.db")
