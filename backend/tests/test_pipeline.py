def test_stage_change_sets_usual_probability_and_writes_entry(api):
    client, _path = api
    deal = next(
        row for row in client.get("/api/deals").json()["items"] if row["name"] == "Website refresh"
    )
    assert deal["stage"] == "New"
    assert deal["probability"] == 10
    held = client.patch(f"/api/deals/{deal['id']}", json={"probability": 40}).json()
    assert held["probability"] == 40
    assert held["probability_hand_set"] is True
    assert held["stage"] == "New"
    moved = client.patch(
        f"/api/deals/{deal['id']}", json={"stage": "Qualified", "position": 0}
    ).json()
    assert moved["stage"] == "Qualified"
    assert moved["probability"] == 30
    assert moved["probability_hand_set"] is False
    titles = [item["title"] for item in moved["timeline"] if item["kind"] == "stage"]
    assert "Moved from New to Qualified" in titles
    listed = next(
        row for row in client.get("/api/deals").json()["items"] if row["id"] == deal["id"]
    )
    assert listed["stage"] == "Qualified"
    assert listed["probability"] == 30


def test_hand_set_probability_stays_until_stage_changes(api):
    client, _path = api
    deal = next(
        row for row in client.get("/api/deals").json()["items"] if row["name"] == "Fleet service"
    )
    client.patch(f"/api/deals/{deal['id']}", json={"probability": 15, "name": "Fleet service"})
    again = client.get(f"/api/deals/{deal['id']}").json()
    assert again["probability"] == 15
    assert again["stage"] == "Qualified"


def test_won_or_lost_fills_empty_close_date(api):
    client, _path = api
    org = client.get("/api/organizations").json()["items"][0]
    created = client.post(
        "/api/deals",
        json={"name": "Undated", "organization_id": org["id"], "value": "50", "stage": "New"},
    ).json()
    assert created["close_date"] is None
    won = client.patch(f"/api/deals/{created['id']}", json={"stage": "Won"}).json()
    assert won["close_date"] == won["today"]
    lost_org = org["id"]
    lost = client.post(
        "/api/deals",
        json={"name": "Undated loss", "organization_id": lost_org, "value": "20", "stage": "Lost"},
    ).json()
    assert lost["close_date"] == lost["today"]
    assert lost["probability"] == 0


def test_late_rules(api):
    client, _path = api
    today = client.get("/api/dashboard").json()["today"]
    rows = client.get("/api/deals").json()["items"]
    late = next(row for row in rows if row["name"] == "Kitchen rollout")
    assert late["late"] is True
    assert late["close_date"] < today
    won = next(row for row in rows if row["stage"] == "Won")
    assert won["late"] is False
    future = next(row for row in rows if row["name"] == "Staff training")
    assert future["late"] is False


def test_drop_reindexes_and_same_column_skips_stage_entry(api):
    client, _path = api
    before = client.get("/api/deals").json()["items"]
    training = next(row for row in before if row["name"] == "Staff training")
    entries_before = [
        item["title"]
        for item in client.get(f"/api/deals/{training['id']}").json()["timeline"]
        if item["kind"] == "stage"
    ]
    moved = client.patch(f"/api/deals/{training['id']}", json={"position": 0}).json()
    assert moved["stage"] == "New"
    entries_after = [item["title"] for item in moved["timeline"] if item["kind"] == "stage"]
    assert entries_after == entries_before
    new_rows = [row for row in client.get("/api/deals").json()["items"] if row["stage"] == "New"]
    positions = sorted(row["position"] for row in new_rows)
    assert positions == list(range(len(new_rows)))
    assert next(row for row in new_rows if row["id"] == training["id"])["position"] == 0

    qualified = client.patch(
        f"/api/deals/{training['id']}",
        json={"stage": "Qualified", "position": 1},
    ).json()
    assert any(
        item["title"] == "Moved from New to Qualified"
        for item in qualified["timeline"]
        if item["kind"] == "stage"
    )
    rows = client.get("/api/deals").json()["items"]
    for stage in ("New", "Qualified"):
        group = sorted(
            (row for row in rows if row["stage"] == stage), key=lambda row: row["position"]
        )
        assert [row["position"] for row in group] == list(range(len(group)))


def test_column_add_starts_at_that_stage_on_top(api):
    client, _path = api
    org = client.get("/api/organizations").json()["items"][0]
    created = client.post(
        "/api/deals",
        json={
            "name": "Column add",
            "organization_id": org["id"],
            "value": "15",
            "stage": "Negotiation",
        },
    ).json()
    assert created["stage"] == "Negotiation"
    assert created["probability"] == 70
    assert created["probability_hand_set"] is False
    assert created["position"] == 0
    table_add = client.post(
        "/api/deals",
        json={"name": "Table add", "organization_id": org["id"], "value": "15"},
    ).json()
    assert table_add["stage"] == "New"
    assert table_add["position"] == 0


def test_expected_revenue(api):
    client, _path = api
    org = client.get("/api/organizations").json()["items"][0]
    created = client.post(
        "/api/deals",
        json={"name": "Hundred", "organization_id": org["id"], "value": "100.00", "stage": "New"},
    ).json()
    assert created["value_cents"] == 10000
    assert created["expected_cents"] == 1000
