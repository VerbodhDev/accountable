from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy import func, nulls_last, or_, select
from sqlalchemy.engine import Connection

from accountable.auth import require_user
from accountable.crm import rules
from accountable.crm.schemas import ActivityIn, ContactIn, DealIn, OrganizationIn
from accountable.crm.tables import activities, contacts, deals, organizations, stage_entries
from accountable.db import get_engine

router = APIRouter(prefix="/api", dependencies=[Depends(require_user)])


def get_conn(request: Request):
    engine = get_engine(request.app.state.db_path)
    with engine.begin() as conn:
        yield conn


db_conn = Depends(get_conn)


def _today() -> date:
    return date.today()


def _found(conn: Connection, table, row_id: int) -> bool:
    return conn.execute(select(table.c.id).where(table.c.id == row_id)).first() is not None


def _person_id(request: Request) -> str:
    return str(request.state.person["id"])


def _author(names: dict[str, str], row) -> str | None:
    return names.get(row["added_by"])


def _org_out(row, added_by_name: str | None) -> dict:
    return {
        "id": row["id"],
        "name": row["name"],
        "website": row["website"],
        "industry": row["industry"],
        "notes": row["notes"],
        "added_by_name": added_by_name,
    }


def _contact_out(row, organization_name: str | None, added_by_name: str | None) -> dict:
    return {
        "id": row["id"],
        "name": row["name"],
        "email": row["email"],
        "phone": row["phone"],
        "job_title": row["job_title"],
        "organization_id": row["organization_id"],
        "organization_name": organization_name,
        "status": row["status"],
        "added_by_name": added_by_name,
    }


def _deal_out(
    row,
    organization_name: str,
    contact_name: str | None,
    today: date,
    added_by_name: str | None,
) -> dict:
    return {
        "id": row["id"],
        "name": row["name"],
        "organization_id": row["organization_id"],
        "organization_name": organization_name,
        "contact_id": row["contact_id"],
        "contact_name": contact_name,
        "stage": row["stage"],
        "value_cents": row["value_cents"],
        "probability": row["probability"],
        "probability_hand_set": bool(row["probability_hand_set"]),
        "close_date": row["close_date"],
        "position": row["position"],
        "late": rules.is_late(row["stage"], row["close_date"], today),
        "expected_cents": rules.expected_cents(row["value_cents"], row["probability"]),
        "added_by_name": added_by_name,
    }


def _load_deal(conn: Connection, deal_id: int, today: date) -> dict | None:
    row = (
        conn.execute(
            select(
                deals,
                organizations.c.name.label("organization_name"),
                contacts.c.name.label("contact_name"),
            )
            .join(organizations, deals.c.organization_id == organizations.c.id)
            .outerjoin(contacts, deals.c.contact_id == contacts.c.id)
            .where(deals.c.id == deal_id)
        )
        .mappings()
        .first()
    )
    if row is None:
        return None
    names = rules.person_names(conn)
    return _deal_out(row, row["organization_name"], row["contact_name"], today, _author(names, row))


def _activity_item(
    row, record_type: str, record_id: int, record_name: str, added_by_name: str | None
) -> dict:
    return {
        "kind": "activity",
        "id": row["id"],
        "happened_at": row["happened_at"],
        "title": row["type"],
        "detail": row["description"],
        "type": row["type"],
        "description": row["description"],
        "follow_up_date": row["follow_up_date"],
        "done": bool(row["done"]),
        "contact_id": row["contact_id"],
        "deal_id": row["deal_id"],
        "record_type": record_type,
        "record_id": record_id,
        "record_name": record_name,
        "added_by_name": added_by_name,
    }


def _stage_item(row, deal_name: str) -> dict:
    return {
        "kind": "stage",
        "id": row["id"],
        "happened_at": row["happened_at"],
        "title": row["text"],
        "detail": "",
        "record_type": "deal",
        "record_id": row["deal_id"],
        "record_name": deal_name,
    }


def _sort_timeline(items: list[dict]) -> list[dict]:
    items.sort(key=lambda item: (item["happened_at"], item["id"]), reverse=True)
    return items


def _deal_timeline(conn: Connection, deal_id: int, deal_name: str) -> list[dict]:
    names = rules.person_names(conn)
    items = []
    for row in conn.execute(select(activities).where(activities.c.deal_id == deal_id)).mappings():
        items.append(_activity_item(row, "deal", deal_id, deal_name, _author(names, row)))
    for row in conn.execute(
        select(stage_entries).where(stage_entries.c.deal_id == deal_id)
    ).mappings():
        items.append(_stage_item(row, deal_name))
    return _sort_timeline(items)


def _contact_timeline(conn: Connection, contact_id: int, contact_name: str) -> list[dict]:
    authors = rules.person_names(conn)
    items = []
    for row in conn.execute(
        select(activities).where(activities.c.contact_id == contact_id)
    ).mappings():
        items.append(
            _activity_item(row, "contact", contact_id, contact_name, _author(authors, row))
        )
    deal_rows = conn.execute(
        select(deals.c.id, deals.c.name).where(deals.c.contact_id == contact_id)
    ).all()
    deal_ids = [row.id for row in deal_rows]
    deal_names = {row.id: row.name for row in deal_rows}
    if deal_ids:
        for row in conn.execute(
            select(activities).where(activities.c.deal_id.in_(deal_ids))
        ).mappings():
            items.append(
                _activity_item(
                    row,
                    "deal",
                    row["deal_id"],
                    deal_names[row["deal_id"]],
                    _author(authors, row),
                )
            )
        for row in conn.execute(
            select(stage_entries).where(stage_entries.c.deal_id.in_(deal_ids))
        ).mappings():
            items.append(_stage_item(row, deal_names[row["deal_id"]]))
    return _sort_timeline(items)


def _direction(raw: str | None) -> str:
    return "desc" if raw == "desc" else "asc"


def _ordered(column, direction: str, blanks_last: bool = False):
    ordered = column.desc() if direction == "desc" else column.asc()
    if blanks_last:
        return nulls_last(ordered)
    return ordered


@router.get("/dashboard")
def get_dashboard(conn: Connection = db_conn):
    return rules.dashboard(conn, _today())


@router.get("/organizations")
def list_organizations(
    q: str = "",
    sort: str = "",
    dir: str = "",
    conn: Connection = db_conn,
):
    stmt = select(organizations)
    needle = q.strip().lower()
    if needle:
        stmt = stmt.where(
            or_(
                func.lower(organizations.c.name).contains(needle, autoescape=True),
                func.lower(organizations.c.industry).contains(needle, autoescape=True),
                func.lower(organizations.c.website).contains(needle, autoescape=True),
            )
        )
    columns = {
        "name": organizations.c.name,
        "industry": organizations.c.industry,
        "website": organizations.c.website,
    }
    column = columns.get(sort, organizations.c.name)
    stmt = stmt.order_by(_ordered(column, _direction(dir) if sort else "asc"))
    rows = conn.execute(stmt).mappings().all()
    names = rules.person_names(conn)
    return {
        "today": _today().isoformat(),
        "items": [_org_out(row, _author(names, row)) for row in rows],
    }


@router.post("/organizations", status_code=201)
def post_organization(body: OrganizationIn, request: Request, conn: Connection = db_conn):
    org_id = rules.create_organization(
        conn, body.model_dump(exclude_unset=True), _person_id(request)
    )
    row = conn.execute(select(organizations).where(organizations.c.id == org_id)).mappings().one()
    return _org_out(row, _author(rules.person_names(conn), row))


@router.get("/organizations/{org_id}")
def get_organization(org_id: int, conn: Connection = db_conn):
    row = conn.execute(select(organizations).where(organizations.c.id == org_id)).mappings().first()
    if row is None:
        raise HTTPException(status_code=404, detail="Not found")
    today = _today()
    people = (
        conn.execute(
            select(contacts, organizations.c.name.label("organization_name"))
            .outerjoin(organizations, contacts.c.organization_id == organizations.c.id)
            .where(contacts.c.organization_id == org_id)
            .order_by(contacts.c.name)
        )
        .mappings()
        .all()
    )
    deal_rows = (
        conn.execute(
            select(
                deals,
                organizations.c.name.label("organization_name"),
                contacts.c.name.label("contact_name"),
            )
            .join(organizations, deals.c.organization_id == organizations.c.id)
            .outerjoin(contacts, deals.c.contact_id == contacts.c.id)
            .where(deals.c.organization_id == org_id)
            .order_by(deals.c.name)
        )
        .mappings()
        .all()
    )
    names = rules.person_names(conn)
    payload = _org_out(row, _author(names, row))
    payload["contacts"] = [
        _contact_out(item, item["organization_name"], _author(names, item)) for item in people
    ]
    payload["deals"] = [
        _deal_out(
            item, item["organization_name"], item["contact_name"], today, _author(names, item)
        )
        for item in deal_rows
    ]
    return payload


@router.patch("/organizations/{org_id}")
def patch_organization(
    org_id: int, body: OrganizationIn, request: Request, conn: Connection = db_conn
):
    if not _found(conn, organizations, org_id):
        raise HTTPException(status_code=404, detail="Not found")
    rules.update_organization(
        conn, org_id, body.model_dump(exclude_unset=True), _person_id(request)
    )
    row = conn.execute(select(organizations).where(organizations.c.id == org_id)).mappings().one()
    return _org_out(row, _author(rules.person_names(conn), row))


@router.delete("/organizations/{org_id}", status_code=204)
def remove_organization(org_id: int, conn: Connection = db_conn):
    if not rules.delete_organization(conn, org_id):
        raise HTTPException(status_code=404, detail="Not found")
    return Response(status_code=204)


@router.get("/contacts")
def list_contacts(
    q: str = "",
    sort: str = "",
    dir: str = "",
    status: str = "",
    conn: Connection = db_conn,
):
    stmt = select(contacts, organizations.c.name.label("organization_name")).outerjoin(
        organizations, contacts.c.organization_id == organizations.c.id
    )
    needle = q.strip().lower()
    if needle:
        stmt = stmt.where(
            or_(
                func.lower(contacts.c.name).contains(needle, autoescape=True),
                func.lower(contacts.c.email).contains(needle, autoescape=True),
                func.lower(contacts.c.phone).contains(needle, autoescape=True),
                func.lower(contacts.c.job_title).contains(needle, autoescape=True),
                func.lower(organizations.c.name).contains(needle, autoescape=True),
            )
        )
    if status.strip():
        parsed = rules.parse_status(status, required=True)
        stmt = stmt.where(contacts.c.status == parsed)
    columns = {
        "name": contacts.c.name,
        "email": contacts.c.email,
        "phone": contacts.c.phone,
        "job_title": contacts.c.job_title,
        "status": contacts.c.status,
        "organization": organizations.c.name,
    }
    column = columns.get(sort, contacts.c.name)
    stmt = stmt.order_by(_ordered(column, _direction(dir) if sort else "asc"))
    rows = conn.execute(stmt).mappings().all()
    names = rules.person_names(conn)
    return {
        "today": _today().isoformat(),
        "items": [_contact_out(row, row["organization_name"], _author(names, row)) for row in rows],
    }


@router.post("/contacts", status_code=201)
def post_contact(body: ContactIn, request: Request, conn: Connection = db_conn):
    contact_id = rules.create_contact(
        conn, body.model_dump(exclude_unset=True), _person_id(request)
    )
    return _contact_payload(conn, contact_id)


def _contact_payload(conn: Connection, contact_id: int) -> dict:
    row = (
        conn.execute(
            select(contacts, organizations.c.name.label("organization_name"))
            .outerjoin(organizations, contacts.c.organization_id == organizations.c.id)
            .where(contacts.c.id == contact_id)
        )
        .mappings()
        .one()
    )
    names = rules.person_names(conn)
    payload = _contact_out(row, row["organization_name"], _author(names, row))
    today = _today()
    deal_rows = (
        conn.execute(
            select(
                deals,
                organizations.c.name.label("organization_name"),
                contacts.c.name.label("contact_name"),
            )
            .join(organizations, deals.c.organization_id == organizations.c.id)
            .outerjoin(contacts, deals.c.contact_id == contacts.c.id)
            .where(deals.c.contact_id == contact_id)
            .order_by(deals.c.name)
        )
        .mappings()
        .all()
    )
    payload["deals"] = [
        _deal_out(
            item, item["organization_name"], item["contact_name"], today, _author(names, item)
        )
        for item in deal_rows
    ]
    payload["timeline"] = _contact_timeline(conn, contact_id, row["name"])
    payload["today"] = today.isoformat()
    return payload


@router.get("/contacts/{contact_id}")
def get_contact(contact_id: int, conn: Connection = db_conn):
    if not _found(conn, contacts, contact_id):
        raise HTTPException(status_code=404, detail="Not found")
    return _contact_payload(conn, contact_id)


@router.patch("/contacts/{contact_id}")
def patch_contact(contact_id: int, body: ContactIn, request: Request, conn: Connection = db_conn):
    if not _found(conn, contacts, contact_id):
        raise HTTPException(status_code=404, detail="Not found")
    rules.update_contact(conn, contact_id, body.model_dump(exclude_unset=True), _person_id(request))
    return _contact_payload(conn, contact_id)


@router.delete("/contacts/{contact_id}", status_code=204)
def remove_contact(contact_id: int, conn: Connection = db_conn):
    if not rules.delete_contact(conn, contact_id):
        raise HTTPException(status_code=404, detail="Not found")
    return Response(status_code=204)


def _deal_stmt():
    return (
        select(
            deals,
            organizations.c.name.label("organization_name"),
            contacts.c.name.label("contact_name"),
        )
        .join(organizations, deals.c.organization_id == organizations.c.id)
        .outerjoin(contacts, deals.c.contact_id == contacts.c.id)
    )


@router.get("/deals")
def list_deals(
    q: str = "",
    sort: str = "",
    dir: str = "",
    conn: Connection = db_conn,
):
    stmt = _deal_stmt()
    needle = q.strip().lower()
    if needle:
        stmt = stmt.where(
            or_(
                func.lower(deals.c.name).contains(needle, autoescape=True),
                func.lower(organizations.c.name).contains(needle, autoescape=True),
                func.lower(contacts.c.name).contains(needle, autoescape=True),
            )
        )
    columns = {
        "name": deals.c.name,
        "organization": organizations.c.name,
        "contact": contacts.c.name,
        "stage": deals.c.stage,
        "value": deals.c.value_cents,
        "probability": deals.c.probability,
        "close_date": deals.c.close_date,
    }
    if not sort:
        stmt = stmt.order_by(_ordered(deals.c.close_date, "asc", blanks_last=True), deals.c.id)
    else:
        column = columns.get(sort, deals.c.close_date)
        blanks = column is deals.c.close_date
        stmt = stmt.order_by(_ordered(column, _direction(dir), blanks_last=blanks), deals.c.id)
    today = _today()
    rows = conn.execute(stmt).mappings().all()
    names = rules.person_names(conn)
    return {
        "today": today.isoformat(),
        "items": [
            _deal_out(
                row, row["organization_name"], row["contact_name"], today, _author(names, row)
            )
            for row in rows
        ],
    }


@router.post("/deals", status_code=201)
def post_deal(body: DealIn, request: Request, conn: Connection = db_conn):
    deal_id = rules.create_deal(
        conn, body.model_dump(exclude_unset=True), _today(), _person_id(request)
    )
    return _deal_payload(conn, deal_id)


def _deal_payload(conn: Connection, deal_id: int) -> dict:
    today = _today()
    payload = _load_deal(conn, deal_id, today)
    if payload is None:
        raise HTTPException(status_code=404, detail="Not found")
    payload["timeline"] = _deal_timeline(conn, deal_id, payload["name"])
    payload["today"] = today.isoformat()
    return payload


@router.get("/deals/{deal_id}")
def get_deal(deal_id: int, conn: Connection = db_conn):
    if not _found(conn, deals, deal_id):
        raise HTTPException(status_code=404, detail="Not found")
    return _deal_payload(conn, deal_id)


@router.patch("/deals/{deal_id}")
def patch_deal(deal_id: int, body: DealIn, request: Request, conn: Connection = db_conn):
    if not _found(conn, deals, deal_id):
        raise HTTPException(status_code=404, detail="Not found")
    rules.update_deal(
        conn, deal_id, body.model_dump(exclude_unset=True), _today(), _person_id(request)
    )
    return _deal_payload(conn, deal_id)


@router.delete("/deals/{deal_id}", status_code=204)
def remove_deal(deal_id: int, conn: Connection = db_conn):
    if not rules.delete_deal(conn, deal_id):
        raise HTTPException(status_code=404, detail="Not found")
    return Response(status_code=204)


def _one_activity(conn: Connection, row) -> dict:
    record_type = "contact" if row["contact_id"] else "deal"
    record_id = row["contact_id"] or row["deal_id"]
    added = _author(rules.person_names(conn), row)
    return _activity_item(
        row, record_type, record_id, rules._record_name(conn, record_type, record_id), added
    )


@router.post("/activities", status_code=201)
def post_activity(body: ActivityIn, request: Request, conn: Connection = db_conn):
    activity_id = rules.create_activity(
        conn, body.model_dump(exclude_unset=True), _today(), _person_id(request)
    )
    row = conn.execute(select(activities).where(activities.c.id == activity_id)).mappings().one()
    return _one_activity(conn, row)


@router.patch("/activities/{activity_id}")
def patch_activity(
    activity_id: int, body: ActivityIn, request: Request, conn: Connection = db_conn
):
    if not _found(conn, activities, activity_id):
        raise HTTPException(status_code=404, detail="Not found")
    rules.update_activity(
        conn, activity_id, body.model_dump(exclude_unset=True), _today(), _person_id(request)
    )
    row = conn.execute(select(activities).where(activities.c.id == activity_id)).mappings().one()
    return _one_activity(conn, row)


@router.delete("/activities/{activity_id}", status_code=204)
def remove_activity(activity_id: int, conn: Connection = db_conn):
    if not rules.delete_activity(conn, activity_id):
        raise HTTPException(status_code=404, detail="Not found")
    return Response(status_code=204)


@router.delete("/stage-entries/{entry_id}", status_code=204)
def remove_stage_entry(entry_id: int, conn: Connection = db_conn):
    if not rules.delete_stage_entry(conn, entry_id):
        raise HTTPException(status_code=404, detail="Not found")
    return Response(status_code=204)
