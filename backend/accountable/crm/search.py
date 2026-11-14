from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.engine import Connection

from accountable.auth import require_user
from accountable.crm.routes import db_conn
from accountable.crm.tables import contacts, deals, organizations

router = APIRouter(prefix="/api", dependencies=[Depends(require_user)])


def _named(conn: Connection, table, kind: str, text: str) -> list[dict[str, object]]:
    rows = conn.execute(
        select(table.c.id, table.c.name)
        .where(func.lower(table.c.name).contains(text))
        .order_by(table.c.name)
    )
    return [{"kind": kind, "id": row.id, "name": row.name} for row in rows]


@router.get("/search")
def search_records(q: str = "", conn: Connection = db_conn) -> dict[str, list[dict[str, object]]]:
    text = q.strip().lower()
    if not text:
        return {"items": []}
    items = [
        *_named(conn, organizations, "organization", text),
        *_named(conn, contacts, "contact", text),
        *_named(conn, deals, "deal", text),
    ]
    return {"items": items}
