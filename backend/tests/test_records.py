def _items(client, path):
    return client.get(path).json()["items"]


def test_created_record_stores_the_signed_in_person(api):
    client, path = api
    jordan = client.post(
        "/api/session",
        json={"email": "jordan.blake@example.com", "password": "local-only"},
    )
    assert jordan.status_code == 200
    client.headers["Authorization"] = f"Bearer {jordan.json()['token']}"
    created = client.post(
        "/api/organizations",
        json={"name": "Jordan Co", "added_by": "alex-rivera"},
    ).json()
    assert created["added_by_name"] == "Jordan Blake"
    assert "updated_by" not in created
    sam = client.post(
        "/api/session",
        json={"email": "sam.patel@example.com", "password": "local-only"},
    )
    client.headers["Authorization"] = f"Bearer {sam.json()['token']}"
    patched = client.patch(f"/api/organizations/{created['id']}", json={"notes": "Later"}).json()
    assert patched["added_by_name"] == "Jordan Blake"
    assert "updated_by" not in patched

    from accountable.crm.tables import organizations
    from accountable.db import get_engine
    from sqlalchemy import select

    with get_engine(path).connect() as conn:
        row = conn.execute(
            select(organizations.c.added_by, organizations.c.updated_by).where(
                organizations.c.id == created["id"]
            )
        ).one()
    assert row.added_by == "jordan-blake"
    assert row.updated_by == "sam-patel"


def test_bad_field_missing_and_delete(api):
    client, _path = api
    bad = client.post("/api/organizations", json={"name": "  "})
    assert bad.status_code == 422
    assert bad.json()["detail"]["field"] == "name"
    missing = client.get("/api/organizations/999999")
    assert missing.status_code == 404
    created = client.post(
        "/api/organizations", json={"name": "Practice Co", "website": "https://practice.example"}
    ).json()
    removed = client.delete(f"/api/organizations/{created['id']}")
    assert removed.status_code == 204
    assert client.get(f"/api/organizations/{created['id']}").status_code == 404


def test_delete_organization_removes_children(api):
    client, _path = api
    org = next(row for row in _items(client, "/api/organizations") if row["name"] == "Lumen Clinic")
    detail = client.get(f"/api/organizations/{org['id']}").json()
    assert detail["contacts"]
    assert detail["deals"]
    contact_id = detail["contacts"][0]["id"]
    deal_id = detail["deals"][0]["id"]
    assert client.delete(f"/api/organizations/{org['id']}").status_code == 204
    assert client.get(f"/api/contacts/{contact_id}").status_code == 404
    assert client.get(f"/api/deals/{deal_id}").status_code == 404
    assert all(row["name"] != "Lumen Clinic" for row in _items(client, "/api/organizations"))


def test_delete_contact_keeps_the_deal(api):
    client, _path = api
    priya = next(row for row in _items(client, "/api/contacts") if row["name"] == "Priya Shah")
    portal = next(row for row in _items(client, "/api/deals") if row["name"] == "Clinic portal")
    assert portal["contact_id"] == priya["id"]
    assert client.delete(f"/api/contacts/{priya['id']}").status_code == 204
    deal = client.get(f"/api/deals/{portal['id']}").json()
    assert deal["contact_id"] is None
    assert deal["organization_name"] == "Lumen Clinic"


def test_delete_deal_keeps_org_and_contact(api):
    client, _path = api
    deal = next(row for row in _items(client, "/api/deals") if row["name"] == "Website refresh")
    assert client.delete(f"/api/deals/{deal['id']}").status_code == 204
    assert client.get(f"/api/organizations/{deal['organization_id']}").status_code == 200
    assert client.get(f"/api/contacts/{deal['contact_id']}").status_code == 200
    assert client.get(f"/api/deals/{deal['id']}").status_code == 404


def test_list_search_and_sort(api):
    client, _path = api
    lumen = client.get("/api/organizations", params={"q": "LUMEN"}).json()["items"]
    assert [row["name"] for row in lumen] == ["Lumen Clinic"]
    part = client.get("/api/organizations", params={"q": "ight"}).json()["items"]
    assert any(row["name"] == "Brightpath Software" for row in part)
    dental = client.get("/api/organizations", params={"q": "dental"}).json()["items"]
    assert any(row["industry"] == "Dental" for row in dental)
    site = client.get("/api/organizations", params={"q": "oak.example"}).json()["items"]
    assert any(row["name"] == "Oak & Iron" for row in site)
    priya = client.get("/api/contacts", params={"q": "priya"}).json()["items"]
    assert any(row["name"] == "Priya Shah" for row in priya)
    by_org = client.get("/api/contacts", params={"q": "bakery"}).json()["items"]
    assert by_org and all(
        "Northwind" in (row["organization_name"] or "") or "bakery" in row["name"].lower()
        for row in by_org
    )
    deals = client.get("/api/deals", params={"q": "Priya"}).json()["items"]
    assert any(row["name"] == "Clinic portal" for row in deals)
    asc = [
        row["name"]
        for row in client.get("/api/organizations", params={"sort": "name", "dir": "asc"}).json()[
            "items"
        ]
    ]
    desc = [
        row["name"]
        for row in client.get("/api/organizations", params={"sort": "name", "dir": "desc"}).json()[
            "items"
        ]
    ]
    assert asc == sorted(asc)
    assert desc == list(reversed(asc))
    default_deals = client.get("/api/deals").json()["items"]
    dates = [row["close_date"] for row in default_deals]
    filled = [item for item in dates if item]
    assert filled == sorted(filled)
    assert dates[-1] is None
    leads = client.get("/api/contacts", params={"status": "lead", "q": "ada"}).json()["items"]
    assert [row["name"] for row in leads] == ["Ada West"]
    customers = client.get("/api/contacts", params={"status": "customer"}).json()["items"]
    assert customers and all(row["status"] == "Customer" for row in customers)


def test_main_contact_and_org_move(api):
    client, _path = api
    bright = next(
        row for row in _items(client, "/api/organizations") if row["name"] == "Brightpath Software"
    )
    lumen = next(
        row for row in _items(client, "/api/organizations") if row["name"] == "Lumen Clinic"
    )
    priya = next(row for row in _items(client, "/api/contacts") if row["name"] == "Priya Shah")
    bad = client.post(
        "/api/deals",
        json={
            "name": "Mismatch",
            "organization_id": bright["id"],
            "contact_id": priya["id"],
            "value": "10",
        },
    )
    assert bad.status_code == 422
    assert bad.json()["detail"]["field"] == "contact_id"
    created = client.post(
        "/api/deals",
        json={
            "name": "Mismatch",
            "organization_id": lumen["id"],
            "contact_id": priya["id"],
            "value": "10",
        },
    ).json()
    moved = client.patch(
        f"/api/deals/{created['id']}", json={"organization_id": bright["id"]}
    ).json()
    assert moved["organization_id"] == bright["id"]
    assert moved["contact_id"] is None


def test_new_contact_is_lead_and_optional_org(api):
    client, _path = api
    created = client.post("/api/contacts", json={"name": "Pat Lee"}).json()
    assert created["status"] == "Lead"
    assert created["organization_id"] is None
    negative = client.post(
        "/api/deals",
        json={
            "name": "Below zero",
            "organization_id": created["id"] and _items(client, "/api/organizations")[0]["id"],
            "value": "-1",
        },
    )
    assert negative.status_code == 422
    assert negative.json()["detail"]["field"] == "value"
