def test_part_of_a_name_matches_in_any_case(api):
    client, _path = api
    lumen = client.get("/api/search", params={"q": "lUmEn"}).json()["items"]
    assert {"kind": "organization", "name": "Lumen Clinic"} == {
        "kind": lumen[0]["kind"],
        "name": lumen[0]["name"],
    }
    priya = client.get("/api/search", params={"q": "PRIYA"}).json()["items"]
    assert any(item["kind"] == "contact" and item["name"] == "Priya Shah" for item in priya)
    retainer = client.get("/api/search", params={"q": "retainer"}).json()["items"]
    assert any(item["kind"] == "deal" and item["name"] == "Annual retainer" for item in retainer)


def test_industry_and_email_do_not_match_the_top_bar(api):
    client, _path = api
    health = client.get("/api/search", params={"q": "health"}).json()["items"]
    assert all(item["name"] != "Lumen Clinic" for item in health)
    ada = client.get("/api/search", params={"q": "ada@"}).json()["items"]
    assert all(item["name"] != "Ada West" for item in ada)


def test_an_empty_query_returns_nothing(api):
    client, _path = api
    assert client.get("/api/search", params={"q": ""}).json() == {"items": []}
    assert client.get("/api/search", params={"q": "   "}).json() == {"items": []}


def test_search_refuses_a_missing_token(api):
    client, _path = api
    client.headers.pop("Authorization")
    assert client.get("/api/search", params={"q": "lumen"}).status_code == 401
