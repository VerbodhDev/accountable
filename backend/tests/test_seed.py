import os
import subprocess
from datetime import date
from pathlib import Path

from accountable.db import init_database, reset_database


def test_fresh_database_matches_the_sample_set(api):
    client, _path = api
    orgs = client.get("/api/organizations").json()["items"]
    contacts = client.get("/api/contacts").json()["items"]
    deals = client.get("/api/deals").json()["items"]
    dashboard = client.get("/api/dashboard").json()
    assert len(orgs) == 8
    assert len({org["industry"] for org in orgs}) == 8
    assert len(contacts) == 18
    assert [row["status"] for row in contacts].count("Lead") == 6
    assert [row["status"] for row in contacts].count("Qualified") == 6
    assert [row["status"] for row in contacts].count("Customer") == 6
    assert len(deals) == 20
    for stage in ("New", "Qualified", "Proposal", "Negotiation", "Won", "Lost"):
        assert sum(1 for deal in deals if deal["stage"] == stage) >= 2
    assert sum(1 for deal in deals if deal["late"]) >= 2
    assert any(deal["stage"] == "Lost" for deal in deals)
    today = date.fromisoformat(dashboard["today"])
    assert any(deal["close_date"] and deal["close_date"] > today.isoformat() for deal in deals)
    assert any(month["count"] == 0 and month["cents"] == 0 for month in dashboard["months"])
    assert len(dashboard["months"]) == 6
    tasks = dashboard["tasks"]
    assert _activity_count(client) == 12
    kinds = _activity_types(client)
    assert {"Note", "Call", "Email"} <= kinds
    assert sum(1 for task in tasks if task["group"] == "overdue") >= 2
    assert sum(1 for task in tasks if task["group"] == "upcoming") >= 2
    assert _activities_without_follow_up(client) >= 1


def _each_activity(client):
    seen = set()
    for deal in client.get("/api/deals").json()["items"]:
        for item in client.get(f"/api/deals/{deal['id']}").json()["timeline"]:
            if item["kind"] == "activity" and item["id"] not in seen:
                seen.add(item["id"])
                yield item
    for contact in client.get("/api/contacts").json()["items"]:
        for item in client.get(f"/api/contacts/{contact['id']}").json()["timeline"]:
            if item["kind"] == "activity" and item["record_type"] == "contact" and item["id"] not in seen:
                seen.add(item["id"])
                yield item


def _activity_count(client) -> int:
    return sum(1 for _item in _each_activity(client))


def _activity_types(client) -> set[str]:
    return {item["type"] for item in _each_activity(client)}


def _activities_without_follow_up(client) -> int:
    return sum(1 for item in _each_activity(client) if not item["follow_up_date"])


def test_second_start_keeps_added_rows(api):
    client, path = api
    owner = Path("data/accountable.db")
    existed = owner.exists()
    before = owner.stat().st_mtime if existed else None
    created = client.post("/api/organizations", json={"name": "Practice Co"}).json()
    init_database(path)
    names = [row["name"] for row in client.get("/api/organizations").json()["items"]]
    assert "Practice Co" in names
    assert len(names) == 9
    again = client.get(f"/api/organizations/{created['id']}")
    assert again.status_code == 200
    assert owner.exists() == existed
    if existed:
        assert owner.stat().st_mtime == before


def test_seed_replaces_rows(api):
    client, path = api
    client.post("/api/organizations", json={"name": "Practice Co"})
    reset_database(path)
    names = [row["name"] for row in client.get("/api/organizations").json()["items"]]
    assert names.count("Brightpath Software") == 1
    assert "Practice Co" not in names
    assert len(names) == 8


def test_seed_script_does_not_ask(tmp_path, monkeypatch):
    monkeypatch.delenv("ACCOUNTABLE_DB", raising=False)
    path = tmp_path / "script.db"
    env = os.environ.copy()
    env["ACCOUNTABLE_DB"] = str(path)
    env["PYTHONPATH"] = "backend"
    result = subprocess.run(
        ["node", "scripts/seed.mjs"],
        cwd=Path_repo(),
        env=env,
        input=b"",
        capture_output=True,
        timeout=120,
    )
    assert result.returncode == 0, result.stderr.decode()
    from accountable.db import organization_count

    assert organization_count(path) == 8


def Path_repo():
    from pathlib import Path

    return Path(__file__).resolve().parents[2]
