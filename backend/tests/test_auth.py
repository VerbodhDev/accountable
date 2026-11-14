from accountable.auth import lookup_supabase_user
from accountable.db import get_engine, postgres_url, rls_statements
from accountable.main import create_app
from fastapi.testclient import TestClient


def test_missing_and_bad_tokens_are_refused(api):
    client, _path = api
    saved = client.headers.pop("Authorization")
    assert client.get("/api/config").status_code == 200
    assert client.get("/api/organizations").status_code == 401
    client.headers["Authorization"] = "Bearer not-a-token"
    assert client.get("/api/dashboard").status_code == 401
    client.headers["Authorization"] = saved


def test_config_hides_the_database_url(api, monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgresql://secret-db-url/hidden")
    monkeypatch.setenv("SUPABASE_URL", "https://example.supabase.co")
    monkeypatch.setenv("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test")
    client, _path = api
    response = client.get("/api/config")
    assert response.status_code == 200
    assert response.json() == {"supabase_url": "", "supabase_publishable_key": ""}
    assert "secret-db-url" not in response.text
    assert "DATABASE_URL" not in response.text


def test_shared_config_returns_only_the_publishable_settings(api, monkeypatch):
    monkeypatch.setattr("accountable.auth.shared_mode", lambda: True)
    monkeypatch.setenv("DATABASE_URL", "postgresql://secret-db-url/hidden")
    monkeypatch.setenv("SUPABASE_URL", "https://example.supabase.co")
    monkeypatch.setenv("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test")
    response = api[0].get("/api/config")
    assert response.json() == {
        "supabase_url": "https://example.supabase.co",
        "supabase_publishable_key": "sb_publishable_test",
    }
    assert "secret-db-url" not in response.text


def test_the_signed_in_person_comes_from_the_token(api, monkeypatch):
    monkeypatch.setattr("accountable.auth.shared_mode", lambda: True)

    def fake_lookup(token: str):
        assert token == "supabase-token"
        return {"id": "user-1", "name": "Casey Quinn", "email": "casey@example.com"}

    monkeypatch.setattr("accountable.auth.lookup_supabase_user", fake_lookup)
    client, _path = api
    client.headers["Authorization"] = "Bearer supabase-token"
    created = client.post(
        "/api/organizations",
        json={"name": "From token", "added_by": "alex-rivera"},
    )
    assert created.status_code == 201
    assert created.json()["added_by_name"] == "Casey Quinn"
    assert "updated_by" not in created.json()


def test_wrong_local_password_stays_a_field_error(api):
    client, _path = api
    bad = client.post(
        "/api/session",
        json={"email": "alex.rivera@example.com", "password": "nope"},
    )
    assert bad.status_code == 422
    assert bad.json()["detail"]["field"] == "password"


def test_lookup_reads_the_auth_user_without_a_live_call(monkeypatch):
    monkeypatch.setenv("SUPABASE_URL", "https://example.supabase.co")
    monkeypatch.setenv("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test")

    class FakeResponse:
        status_code = 200

        def json(self):
            return {
                "id": "abc",
                "email": "a@example.com",
                "user_metadata": {"full_name": "Ada Example"},
            }

    def fake_get(url, headers, timeout):
        assert url == "https://example.supabase.co/auth/v1/user"
        assert headers["apikey"] == "sb_publishable_test"
        assert headers["Authorization"] == "Bearer tok"
        assert timeout == 5
        return FakeResponse()

    monkeypatch.setattr("httpx.get", fake_get)
    assert lookup_supabase_user("tok") == {
        "id": "abc",
        "email": "a@example.com",
        "name": "Ada Example",
    }


def test_shared_mode_requires_the_database_url(monkeypatch, tmp_path):
    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.setenv("ACCOUNTABLE_SHARED", "1")
    try:
        get_engine(tmp_path / "ignored.db")
    except RuntimeError as error:
        assert "DATABASE_URL" in str(error)
    else:
        raise AssertionError("shared mode opened a database with no URL")


def test_shared_preflight_allows_the_private_network(tmp_path, monkeypatch):
    monkeypatch.delenv("ACCOUNTABLE_SHARED", raising=False)
    monkeypatch.setattr("accountable.main.shared_mode", lambda: True)
    monkeypatch.setattr(
        "accountable.main.os_origin",
        lambda: "https://example.cloudfront.net",
    )
    app = create_app(tmp_path / "private.db")
    with TestClient(app) as client:
        response = client.options(
            "/api/config",
            headers={
                "Origin": "https://example.cloudfront.net",
                "Access-Control-Request-Method": "GET",
                "Access-Control-Request-Private-Network": "true",
            },
        )
    assert response.status_code == 200
    assert response.headers["access-control-allow-private-network"] == "true"
    assert response.headers["access-control-allow-origin"] == "https://example.cloudfront.net"


def test_postgres_url_and_rls_do_not_grant_the_publishable_key():
    assert postgres_url("postgres://db.example/app").startswith("postgresql+psycopg://")
    statements = rls_statements()
    assert any("organizations" in statement for statement in statements)
    assert any("people" in statement for statement in statements)
    assert all("POLICY" not in statement for statement in statements)
