def test_activity_parent_and_defaults(api):
    client, _path = api
    deal = next(
        row for row in client.get("/api/deals").json()["items"] if row["name"] == "Fleet service"
    )
    contact = next(
        row for row in client.get("/api/contacts").json()["items"] if row["name"] == "Sam Hill"
    )
    both = client.post(
        "/api/activities",
        json={
            "type": "Note",
            "description": "Both",
            "contact_id": contact["id"],
            "deal_id": deal["id"],
        },
    )
    assert both.status_code == 422
    assert both.json()["detail"]["field"] == "parent"
    neither = client.post("/api/activities", json={"type": "Note", "description": "Neither"})
    assert neither.status_code == 422
    created = client.post(
        "/api/activities",
        json={"type": "Call", "description": "Ring Sam", "contact_id": contact["id"]},
    ).json()
    assert created["done"] is False
    assert created["happened_at"]
    assert created["follow_up_date"] is None
    assert created["deal_id"] is None


def test_mark_done_keeps_the_row(api):
    client, _path = api
    deal = next(
        row for row in client.get("/api/deals").json()["items"] if row["name"] == "Clinic portal"
    )
    created = client.post(
        "/api/activities",
        json={
            "type": "Email",
            "description": "Send the recap",
            "deal_id": deal["id"],
            "follow_up_date": "2000-01-01",
        },
    ).json()
    assert any(
        task["description"] == "Send the recap"
        for task in client.get("/api/dashboard").json()["overdue"]
    )
    done = client.patch(f"/api/activities/{created['id']}", json={"done": True}).json()
    assert done["done"] is True
    detail = client.get(f"/api/deals/{deal['id']}").json()
    assert any(
        item["id"] == created["id"] and item["kind"] == "activity" for item in detail["timeline"]
    )
    assert all(
        task["description"] != "Send the recap"
        for task in client.get("/api/dashboard").json()["tasks"]
    )


def test_delete_activity_or_stage_entry_leaves_the_parent(api):
    client, _path = api
    deal = next(
        row for row in client.get("/api/deals").json()["items"] if row["name"] == "Annual retainer"
    )
    detail = client.get(f"/api/deals/{deal['id']}").json()
    activity = next(item for item in detail["timeline"] if item["kind"] == "activity")
    entry = next(item for item in detail["timeline"] if item["kind"] == "stage")
    assert (
        client.patch(f"/api/stage-entries/{entry['id']}", json={"text": "Edited"}).status_code
        == 405
    )
    assert client.delete(f"/api/activities/{activity['id']}").status_code == 204
    assert client.get(f"/api/deals/{deal['id']}").status_code == 200
    assert client.delete(f"/api/stage-entries/{entry['id']}").status_code == 204
    after = client.get(f"/api/deals/{deal['id']}").json()
    assert after["stage"] == deal["stage"]
    assert all(item["id"] != entry["id"] for item in after["timeline"] if item["kind"] == "stage")


def test_contact_timeline_includes_deal_history(api):
    client, _path = api
    priya = next(
        row for row in client.get("/api/contacts").json()["items"] if row["name"] == "Priya Shah"
    )
    detail = client.get(f"/api/contacts/{priya['id']}").json()
    names = {item["record_name"] for item in detail["timeline"]}
    assert "Clinic portal" in names
    happened = [item["happened_at"] for item in detail["timeline"]]
    assert happened == sorted(happened, reverse=True)


def test_org_delete_removes_activities_and_stage_entries(api):
    client, _path = api
    org = next(
        row
        for row in client.get("/api/organizations").json()["items"]
        if row["name"] == "Fieldnote Studio"
    )
    detail = client.get(f"/api/organizations/{org['id']}").json()
    deal = next(row for row in detail["deals"] if row["name"] == "Annual retainer")
    before = client.get(f"/api/deals/{deal['id']}").json()
    assert any(item["kind"] == "activity" for item in before["timeline"])
    assert any(item["kind"] == "stage" for item in before["timeline"])
    assert client.delete(f"/api/organizations/{org['id']}").status_code == 204
    assert client.get(f"/api/deals/{deal['id']}").status_code == 404
    recent = client.get("/api/dashboard").json()["recent"]
    assert all(item["record_name"] != "Annual retainer" for item in recent)
