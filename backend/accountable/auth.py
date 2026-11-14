import hashlib
import hmac
import os
from typing import TypedDict

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import select, update
from sqlalchemy.engine import Connection

from accountable.crm.rules import FieldError
from accountable.crm.seed import LOCAL_PASSWORD, LOCAL_PEOPLE
from accountable.crm.tables import people
from accountable.db import get_engine
from accountable.db import shared_mode as db_shared_mode

router = APIRouter(prefix="/api")
_LOCAL_SECRET = b"local-only-token"


class Person(TypedDict):
    id: str
    name: str
    email: str


class SessionIn(BaseModel):
    email: str | None = None
    password: str | None = None


def shared_mode() -> bool:
    return db_shared_mode()


def public_config() -> dict[str, str]:
    if not shared_mode():
        return {"supabase_url": "", "supabase_publishable_key": ""}
    return {
        "supabase_url": os.environ.get("SUPABASE_URL", ""),
        "supabase_publishable_key": os.environ.get("SUPABASE_PUBLISHABLE_KEY", ""),
    }


def issue_local_token(person_id: str) -> str:
    nonce = hashlib.sha256(os.urandom(16)).hexdigest()
    body = f"{person_id}.{nonce}"
    signature = hmac.new(_LOCAL_SECRET, body.encode(), hashlib.sha256).hexdigest()
    return f"local.{body}.{signature}"


def person_id_from_local_token(token: str) -> str | None:
    parts = token.split(".")
    if len(parts) != 4 or parts[0] != "local":
        return None
    person_id, nonce, signature = parts[1], parts[2], parts[3]
    expected = hmac.new(_LOCAL_SECRET, f"{person_id}.{nonce}".encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, signature):
        return None
    return person_id


def lookup_supabase_user(token: str) -> Person | None:
    url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    key = os.environ.get("SUPABASE_PUBLISHABLE_KEY", "")
    if not url or not key:
        return None
    import httpx

    try:
        response = httpx.get(
            f"{url}/auth/v1/user",
            headers={"Authorization": f"Bearer {token}", "apikey": key},
            timeout=5,
        )
    except httpx.HTTPError:
        return None
    if response.status_code != 200:
        return None
    body = response.json()
    user_id = body.get("id")
    if not user_id:
        return None
    meta = body.get("user_metadata") or {}
    email = body.get("email") or ""
    name = meta.get("full_name") or meta.get("name") or email
    return {"id": str(user_id), "name": str(name), "email": str(email)}


def _local_person(conn: Connection, email: str) -> Person | None:
    needle = email.strip().lower()
    allowed = {person["email"].lower(): person for person in LOCAL_PEOPLE}
    chosen = allowed.get(needle)
    if chosen is None:
        return None
    row = conn.execute(select(people).where(people.c.id == chosen["id"])).mappings().first()
    if row is None:
        return None
    return {"id": row["id"], "name": row["name"], "email": row["email"]}


def _upsert_person(conn: Connection, person: Person) -> None:
    found = conn.execute(select(people.c.id).where(people.c.id == person["id"])).first()
    if found is None:
        conn.execute(people.insert().values(**person))
        return
    conn.execute(
        update(people)
        .where(people.c.id == person["id"])
        .values(name=person["name"], email=person["email"])
    )


def person_from_token(conn: Connection, token: str) -> Person | None:
    if shared_mode():
        person = lookup_supabase_user(token)
        if person is None:
            return None
        _upsert_person(conn, person)
        return person
    person_id = person_id_from_local_token(token)
    if person_id is None:
        return None
    row = conn.execute(select(people).where(people.c.id == person_id)).mappings().first()
    if row is None:
        return None
    return {"id": row["id"], "name": row["name"], "email": row["email"]}


def require_user(request: Request) -> Person:
    header = request.headers.get("authorization", "")
    token = header[7:].strip() if header.lower().startswith("bearer ") else ""
    if not token:
        raise HTTPException(status_code=401, detail="Sign in")
    engine = get_engine(request.app.state.db_path)
    with engine.begin() as conn:
        person = person_from_token(conn, token)
    if person is None:
        raise HTTPException(status_code=401, detail="Sign in")
    request.state.person = person
    return person


@router.get("/config")
def get_config():
    return public_config()


@router.post("/session")
def start_session(body: SessionIn, request: Request):
    if shared_mode():
        raise HTTPException(status_code=404, detail="Not found")
    email = (body.email or "").strip()
    password = body.password or ""
    if not email:
        raise FieldError("email", "Email is required")
    if not password:
        raise FieldError("password", "Password is required")
    engine = get_engine(request.app.state.db_path)
    with engine.connect() as conn:
        person = _local_person(conn, email) if password == LOCAL_PASSWORD else None
    if person is None:
        raise FieldError("password", "Email or password is wrong")
    return {**person, "token": issue_local_token(person["id"])}
