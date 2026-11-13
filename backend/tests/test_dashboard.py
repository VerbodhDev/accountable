from datetime import date


def test_dashboard_math_matches_the_rows(api):
    client, _path = api
    deals = client.get("/api/deals").json()["items"]
    board = client.get("/api/dashboard").json()
    today = date.fromisoformat(board["today"])
    open_deals = [row for row in deals if row["stage"] not in ("Won", "Lost")]
    assert board["open_pipeline_cents"] == sum(row["value_cents"] for row in open_deals)
    assert board["expected_cents"] == sum(row["expected_cents"] for row in open_deals)
    won_month = [
        row
        for row in deals
        if row["stage"] == "Won" and row["close_date"] and row["close_date"].startswith(today.strftime("%Y-%m"))
    ]
    assert board["won_this_month_cents"] == sum(row["value_cents"] for row in won_month)
    assert board["won_this_month_count"] == len(won_month)
    assert [row["stage"] for row in board["open_stages"]] == ["New", "Qualified", "Proposal", "Negotiation"]
    assert all(row["stage"] not in ("Won", "Lost") for row in board["open_stages"])


def test_won_without_close_date_is_outside_month_totals(api):
    client, _path = api
    org = client.get("/api/organizations").json()["items"][0]
    created = client.post(
        "/api/deals",
        json={"name": "Dateless win", "organization_id": org["id"], "value": "80", "stage": "Won"},
    ).json()
    cleared = client.patch(f"/api/deals/{created['id']}", json={"close_date": None}).json()
    assert cleared["close_date"] is None
    assert cleared["stage"] == "Won"
    deals = client.get("/api/deals").json()["items"]
    board = client.get("/api/dashboard").json()
    won_month_cents = 0
    month = board["today"][:7]
    for row in deals:
        if row["stage"] == "Won" and row["close_date"] and row["close_date"].startswith(month):
            won_month_cents += row["value_cents"]
    assert board["won_this_month_cents"] == won_month_cents
    assert all(row["name"] != "Dateless win" or not row["close_date"] for row in deals)


def test_follow_up_window_and_order(api):
    client, _path = api
    board = client.get("/api/dashboard").json()
    overdue_dates = [row["follow_up_date"] for row in board["overdue"]]
    upcoming_dates = [row["follow_up_date"] for row in board["upcoming"]]
    assert overdue_dates == sorted(overdue_dates)
    assert upcoming_dates == sorted(upcoming_dates)
    assert all(row["follow_up_date"] < board["today"] for row in board["overdue"])
    assert all(board["today"] <= row["follow_up_date"] for row in board["upcoming"])
    later = [row for row in board["tasks"] if row["group"] == "later"]
    assert later
    assert all(row["description"] not in {item["description"] for item in later} for row in board["overdue"])
    assert board["overdue_count"] == len(board["overdue"])


def test_recent_activity_is_ten_newest(api):
    client, _path = api
    recent = client.get("/api/dashboard").json()["recent"]
    assert len(recent) == 10
    stamps = [row["happened_at"] for row in recent]
    assert stamps == sorted(stamps, reverse=True)
    assert recent[0]["title"] == "Moved from Proposal to Negotiation"
    assert recent[0]["record_name"] == "Annual retainer"
    assert all(row["record_name"] for row in recent)


def test_figures_change_when_a_deal_is_won_and_a_follow_up_is_added(api):
    client, _path = api
    org = client.get("/api/organizations").json()["items"][0]
    deal = client.post(
        "/api/deals",
        json={"name": "Quick win", "organization_id": org["id"], "value": "100", "stage": "New"},
    ).json()
    before = client.get("/api/dashboard").json()
    client.patch(f"/api/deals/{deal['id']}", json={"stage": "Won"})
    after = client.get("/api/dashboard").json()
    assert after["won_this_month_count"] == before["won_this_month_count"] + 1
    assert after["open_pipeline_cents"] == before["open_pipeline_cents"] - deal["value_cents"]
    client.post(
        "/api/activities",
        json={
            "type": "Note",
            "description": "Chase the invoice",
            "deal_id": deal["id"],
            "follow_up_date": "1999-01-01",
        },
    )
    overdue = client.get("/api/dashboard").json()
    assert overdue["overdue_count"] == after["overdue_count"] + 1
