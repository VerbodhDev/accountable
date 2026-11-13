import calendar
from datetime import date, datetime, timedelta
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP

from sqlalchemy import delete, select, update

from accountable.crm.tables import activities, contacts, deals, organizations, stage_entries

STAGES = ("New", "Qualified", "Proposal", "Negotiation", "Won", "Lost")
OPEN_STAGES = ("New", "Qualified", "Proposal", "Negotiation")
USUAL_PROBABILITY = {
    "New": 10,
    "Qualified": 30,
    "Proposal": 50,
    "Negotiation": 70,
    "Won": 100,
    "Lost": 0,
}
STATUSES = ("Lead", "Qualified", "Customer")
ACTIVITY_TYPES = ("Note", "Call", "Email")
CLOSED = ("Won", "Lost")


class FieldError(Exception):
    def __init__(self, field: str, message: str):
        self.field = field
        self.message = message


def clean(value: str | None) -> str | None:
    if value is None:
        return None
    text = value.strip()
    return text or None


def parse_money(raw, required: bool) -> int | None:
    if raw is None or raw == "":
        if required:
            raise FieldError("value", "Value is required")
        return None
    try:
        amount = Decimal(str(raw))
    except InvalidOperation:
        raise FieldError("value", "Value must be a number of US dollars") from None
    if amount < 0:
        raise FieldError("value", "Value must be zero or more")
    if amount.as_tuple().exponent < -2:
        raise FieldError("value", "Use at most two decimal places")
    return int((amount * 100).to_integral_value(rounding=ROUND_HALF_UP))


def parse_probability(raw, required: bool) -> int | None:
    if raw is None or raw == "":
        if required:
            raise FieldError("probability", "Probability is required")
        return None
    if isinstance(raw, bool) or not isinstance(raw, int):
        raise FieldError("probability", "Probability must be a whole number from 0 to 100")
    if raw < 0 or raw > 100:
        raise FieldError("probability", "Probability must be a whole number from 0 to 100")
    return raw


def parse_date(raw, field: str, required: bool) -> str | None:
    if raw is None or raw == "":
        if required:
            raise FieldError(field, "Date is required")
        return None
    try:
        date.fromisoformat(str(raw))
    except ValueError:
        raise FieldError(field, "Use a real date") from None
    return str(raw)


def parse_status(raw, required: bool) -> str | None:
    if raw is None or raw == "":
        if required:
            raise FieldError("status", "Status is required")
        return None
    titled = str(raw).strip().title()
    if titled not in STATUSES:
        raise FieldError("status", "Status must be Lead, Qualified, or Customer")
    return titled


def expected_cents(value_cents: int, probability: int) -> int:
    return value_cents * probability // 100


def is_open(stage: str) -> bool:
    return stage not in CLOSED


def is_late(stage: str, close_date: str | None, today: date) -> bool:
    if not is_open(stage) or not close_date:
        return False
    return date.fromisoformat(close_date) < today


def _ids(conn, stmt) -> list[int]:
    return list(conn.execute(stmt).scalars().all())


def _reindex(conn, stage: str, ordered_ids: list[int]) -> None:
    for index, deal_id in enumerate(ordered_ids):
        conn.execute(update(deals).where(deals.c.id == deal_id).values(position=index))


def _column_ids(conn, stage: str, skip: int | None = None) -> list[int]:
    stmt = select(deals.c.id).where(deals.c.stage == stage).order_by(deals.c.position, deals.c.id)
    found = _ids(conn, stmt)
    if skip is None:
        return found
    return [item for item in found if item != skip]


def _require_org(conn, organization_id: int) -> None:
    row = conn.execute(
        select(organizations.c.id).where(organizations.c.id == organization_id)
    ).first()
    if row is None:
        raise FieldError("organization_id", "Choose an organization")


def _contact_org(conn, contact_id: int) -> int | None:
    row = conn.execute(
        select(contacts.c.organization_id).where(contacts.c.id == contact_id)
    ).first()
    if row is None:
        raise FieldError("contact_id", "Choose a contact")
    return row.organization_id


def create_organization(conn, payload: dict) -> int:
    name = clean(payload.get("name"))
    if not name:
        raise FieldError("name", "Name is required")
    result = conn.execute(
        organizations.insert().values(
            name=name,
            website=clean(payload.get("website")),
            industry=clean(payload.get("industry")),
            notes=clean(payload.get("notes")),
        )
    )
    return int(result.inserted_primary_key[0])


def update_organization(conn, org_id: int, payload: dict) -> None:
    current = conn.execute(select(organizations).where(organizations.c.id == org_id)).mappings().first()
    if current is None:
        return
    values = {}
    if "name" in payload:
        name = clean(payload.get("name"))
        if not name:
            raise FieldError("name", "Name is required")
        values["name"] = name
    for field in ("website", "industry", "notes"):
        if field in payload:
            values[field] = clean(payload.get(field))
    if values:
        conn.execute(update(organizations).where(organizations.c.id == org_id).values(**values))


def create_contact(conn, payload: dict) -> int:
    name = clean(payload.get("name"))
    if not name:
        raise FieldError("name", "Name is required")
    status = parse_status(payload.get("status") or "Lead", required=True)
    organization_id = payload.get("organization_id")
    if organization_id is not None:
        _require_org(conn, organization_id)
    result = conn.execute(
        contacts.insert().values(
            name=name,
            email=clean(payload.get("email")),
            phone=clean(payload.get("phone")),
            job_title=clean(payload.get("job_title")),
            organization_id=organization_id,
            status=status,
        )
    )
    return int(result.inserted_primary_key[0])


def update_contact(conn, contact_id: int, payload: dict) -> None:
    current = conn.execute(select(contacts).where(contacts.c.id == contact_id)).mappings().first()
    if current is None:
        return
    values = {}
    if "name" in payload:
        name = clean(payload.get("name"))
        if not name:
            raise FieldError("name", "Name is required")
        values["name"] = name
    for field in ("email", "phone", "job_title"):
        if field in payload:
            values[field] = clean(payload.get(field))
    if "organization_id" in payload:
        organization_id = payload.get("organization_id")
        if organization_id is not None:
            _require_org(conn, organization_id)
        values["organization_id"] = organization_id
    if "status" in payload:
        values["status"] = parse_status(payload.get("status"), required=True)
    if values:
        conn.execute(update(contacts).where(contacts.c.id == contact_id).values(**values))


def _check_contact_for_org(conn, organization_id: int, contact_id: int | None) -> None:
    if contact_id is None:
        return
    contact_org = _contact_org(conn, contact_id)
    if contact_org != organization_id:
        raise FieldError("contact_id", "The main contact must work at that organization")


def create_deal(conn, payload: dict, today: date) -> int:
    name = clean(payload.get("name"))
    if not name:
        raise FieldError("name", "Name is required")
    organization_id = payload.get("organization_id")
    if organization_id is None:
        raise FieldError("organization_id", "Choose an organization")
    _require_org(conn, organization_id)
    stage = payload.get("stage") or "New"
    if stage not in STAGES:
        raise FieldError("stage", "Choose a stage")
    contact_id = payload.get("contact_id")
    _check_contact_for_org(conn, organization_id, contact_id)
    value_cents = parse_money(payload.get("value"), required=True)
    sent_probability = "probability" in payload and payload.get("probability") is not None
    probability = (
        parse_probability(payload.get("probability"), required=True)
        if sent_probability
        else USUAL_PROBABILITY[stage]
    )
    close_date = parse_date(payload.get("close_date"), "close_date", required=False)
    if stage in CLOSED and close_date is None:
        close_date = today.isoformat()
    conn.execute(update(deals).where(deals.c.stage == stage).values(position=deals.c.position + 1))
    result = conn.execute(
        deals.insert().values(
            name=name,
            organization_id=organization_id,
            contact_id=contact_id,
            stage=stage,
            value_cents=value_cents,
            probability=probability,
            probability_hand_set=sent_probability,
            close_date=close_date,
            position=0,
        )
    )
    return int(result.inserted_primary_key[0])


def update_deal(conn, deal_id: int, payload: dict, today: date) -> None:
    current = conn.execute(select(deals).where(deals.c.id == deal_id)).mappings().first()
    if current is None:
        return
    stage = current["stage"]
    stage_changed = False
    if "stage" in payload and payload.get("stage") not in (None, ""):
        if payload["stage"] not in STAGES:
            raise FieldError("stage", "Choose a stage")
        stage_changed = payload["stage"] != current["stage"]
        stage = payload["stage"]
    organization_id = current["organization_id"]
    if "organization_id" in payload and payload.get("organization_id") is not None:
        _require_org(conn, payload["organization_id"])
        organization_id = payload["organization_id"]
    contact_id = current["contact_id"]
    if "contact_id" in payload:
        contact_id = payload.get("contact_id")
    elif organization_id != current["organization_id"] and contact_id is not None:
        contact_org = _contact_org(conn, contact_id)
        if contact_org != organization_id:
            contact_id = None
    _check_contact_for_org(conn, organization_id, contact_id)
    values = {
        "organization_id": organization_id,
        "contact_id": contact_id,
        "stage": stage,
    }
    if "name" in payload:
        name = clean(payload.get("name"))
        if not name:
            raise FieldError("name", "Name is required")
        values["name"] = name
    if "value" in payload:
        values["value_cents"] = parse_money(payload.get("value"), required=True)
    if "close_date" in payload:
        values["close_date"] = parse_date(payload.get("close_date"), "close_date", required=False)
    if stage_changed:
        values["probability"] = USUAL_PROBABILITY[stage]
        values["probability_hand_set"] = False
        if stage in CLOSED and not values.get("close_date", current["close_date"]):
            values["close_date"] = today.isoformat()
    elif "probability" in payload and payload.get("probability") is not None:
        values["probability"] = parse_probability(payload.get("probability"), required=True)
        values["probability_hand_set"] = True
    position = payload.get("position") if "position" in payload else None
    if stage_changed:
        old_ids = _column_ids(conn, current["stage"], skip=deal_id)
        new_ids = _column_ids(conn, stage, skip=deal_id)
        index = 0 if position is None else max(0, min(int(position), len(new_ids)))
        new_ids.insert(index, deal_id)
        conn.execute(update(deals).where(deals.c.id == deal_id).values(**values))
        _reindex(conn, current["stage"], old_ids)
        _reindex(conn, stage, new_ids)
        conn.execute(
            stage_entries.insert().values(
                deal_id=deal_id,
                text=f"Moved from {current['stage']} to {stage}",
                happened_at=datetime.now().replace(microsecond=0).isoformat(),
            )
        )
        return
    if position is not None and int(position) != current["position"]:
        ids = _column_ids(conn, stage, skip=deal_id)
        index = max(0, min(int(position), len(ids)))
        ids.insert(index, deal_id)
        conn.execute(update(deals).where(deals.c.id == deal_id).values(**values))
        _reindex(conn, stage, ids)
        return
    conn.execute(update(deals).where(deals.c.id == deal_id).values(**values))


def _activity_values(payload: dict, current: dict | None, today: date) -> dict:
    contact_id = current["contact_id"] if current else None
    deal_id = current["deal_id"] if current else None
    if "contact_id" in payload:
        contact_id = payload.get("contact_id")
    if "deal_id" in payload:
        deal_id = payload.get("deal_id")
    if (contact_id is None) == (deal_id is None):
        raise FieldError("parent", "Choose a contact or a deal")
    kind = payload.get("type") if "type" in payload else (current["type"] if current else None)
    if kind not in ACTIVITY_TYPES:
        raise FieldError("type", "Type must be Note, Call, or Email")
    description = payload.get("description") if "description" in payload else (current["description"] if current else None)
    description = clean(description)
    if not description:
        raise FieldError("description", "Description is required")
    if "happened_at" in payload and payload.get("happened_at"):
        happened = parse_date(str(payload["happened_at"])[:10], "happened_at", required=True)
        happened_at = f"{happened}T{datetime.now().strftime('%H:%M:%S')}"
        if "T" in str(payload["happened_at"]):
            happened_at = str(payload["happened_at"])[:19]
    elif current:
        happened_at = current["happened_at"]
    else:
        happened_at = datetime.now().replace(microsecond=0).isoformat()
    if "follow_up_date" in payload:
        follow_up = parse_date(payload.get("follow_up_date"), "follow_up_date", required=False)
    elif current:
        follow_up = current["follow_up_date"]
    else:
        follow_up = None
    if "done" in payload and payload.get("done") is not None:
        done = bool(payload["done"])
    elif current:
        done = bool(current["done"])
    else:
        done = False
    return {
        "type": kind,
        "description": description,
        "happened_at": happened_at,
        "follow_up_date": follow_up,
        "done": done,
        "contact_id": contact_id,
        "deal_id": deal_id,
        "today": today,
    }


def create_activity(conn, payload: dict, today: date) -> int:
    if payload.get("contact_id") is not None:
        _contact_org(conn, payload["contact_id"])
    if payload.get("deal_id") is not None:
        row = conn.execute(select(deals.c.id).where(deals.c.id == payload["deal_id"])).first()
        if row is None:
            raise FieldError("deal_id", "Choose a deal")
    values = _activity_values(payload, None, today)
    values.pop("today")
    result = conn.execute(activities.insert().values(**values))
    return int(result.inserted_primary_key[0])


def update_activity(conn, activity_id: int, payload: dict, today: date) -> None:
    current = conn.execute(select(activities).where(activities.c.id == activity_id)).mappings().first()
    if current is None:
        return
    if payload.get("contact_id") is not None:
        _contact_org(conn, payload["contact_id"])
    if payload.get("deal_id") is not None:
        row = conn.execute(select(deals.c.id).where(deals.c.id == payload["deal_id"])).first()
        if row is None:
            raise FieldError("deal_id", "Choose a deal")
    values = _activity_values(payload, current, today)
    values.pop("today")
    conn.execute(update(activities).where(activities.c.id == activity_id).values(**values))


def delete_organization(conn, org_id: int) -> bool:
    if conn.execute(select(organizations.c.id).where(organizations.c.id == org_id)).first() is None:
        return False
    contact_ids = _ids(conn, select(contacts.c.id).where(contacts.c.organization_id == org_id))
    deal_ids = _ids(conn, select(deals.c.id).where(deals.c.organization_id == org_id))
    if deal_ids:
        conn.execute(delete(stage_entries).where(stage_entries.c.deal_id.in_(deal_ids)))
        conn.execute(delete(activities).where(activities.c.deal_id.in_(deal_ids)))
    if contact_ids:
        conn.execute(delete(activities).where(activities.c.contact_id.in_(contact_ids)))
    if deal_ids:
        conn.execute(delete(deals).where(deals.c.id.in_(deal_ids)))
    if contact_ids:
        conn.execute(delete(contacts).where(contacts.c.id.in_(contact_ids)))
    conn.execute(delete(organizations).where(organizations.c.id == org_id))
    return True


def delete_contact(conn, contact_id: int) -> bool:
    if conn.execute(select(contacts.c.id).where(contacts.c.id == contact_id)).first() is None:
        return False
    conn.execute(delete(activities).where(activities.c.contact_id == contact_id))
    conn.execute(update(deals).where(deals.c.contact_id == contact_id).values(contact_id=None))
    conn.execute(delete(contacts).where(contacts.c.id == contact_id))
    return True


def delete_deal(conn, deal_id: int) -> bool:
    if conn.execute(select(deals.c.id).where(deals.c.id == deal_id)).first() is None:
        return False
    conn.execute(delete(activities).where(activities.c.deal_id == deal_id))
    conn.execute(delete(stage_entries).where(stage_entries.c.deal_id == deal_id))
    conn.execute(delete(deals).where(deals.c.id == deal_id))
    return True


def delete_activity(conn, activity_id: int) -> bool:
    result = conn.execute(delete(activities).where(activities.c.id == activity_id))
    return result.rowcount > 0


def delete_stage_entry(conn, entry_id: int) -> bool:
    result = conn.execute(delete(stage_entries).where(stage_entries.c.id == entry_id))
    return result.rowcount > 0


def classify_follow_up(follow_up: str | None, done: bool, today: date) -> str | None:
    if done or not follow_up:
        return None
    day = date.fromisoformat(follow_up)
    if day < today:
        return "overdue"
    if day <= today + timedelta(days=7):
        return "upcoming"
    return "later"


def month_windows(today: date) -> list[dict]:
    windows = []
    for months_ago in range(5, -1, -1):
        year = today.year
        month = today.month - months_ago
        while month <= 0:
            month += 12
            year -= 1
        last = calendar.monthrange(year, month)[1]
        windows.append(
            {
                "start": date(year, month, 1),
                "end": date(year, month, last),
                "label": date(year, month, 1).strftime("%b"),
                "key": f"{year:04d}-{month:02d}",
            }
        )
    return windows


def dashboard(conn, today: date) -> dict:
    deal_rows = conn.execute(select(deals)).mappings().all()
    open_deals = [row for row in deal_rows if is_open(row["stage"])]
    open_pipeline = sum(row["value_cents"] for row in open_deals)
    expected = sum(expected_cents(row["value_cents"], row["probability"]) for row in open_deals)
    won_rows = []
    month_start = date(today.year, today.month, 1)
    month_end = date(today.year, today.month, calendar.monthrange(today.year, today.month)[1])
    for row in deal_rows:
        if row["stage"] != "Won" or not row["close_date"]:
            continue
        closed = date.fromisoformat(row["close_date"])
        if month_start <= closed <= month_end:
            won_rows.append(row)
    months = []
    for window in month_windows(today):
        matched = []
        for row in deal_rows:
            if row["stage"] != "Won" or not row["close_date"]:
                continue
            closed = date.fromisoformat(row["close_date"])
            if window["start"] <= closed <= window["end"]:
                matched.append(row)
        months.append(
            {
                "key": window["key"],
                "label": window["label"],
                "cents": sum(row["value_cents"] for row in matched),
                "count": len(matched),
            }
        )
    open_stages = []
    for stage in OPEN_STAGES:
        rows = [row for row in deal_rows if row["stage"] == stage]
        open_stages.append(
            {
                "stage": stage,
                "count": len(rows),
                "value_cents": sum(row["value_cents"] for row in rows),
                "expected_cents": sum(expected_cents(row["value_cents"], row["probability"]) for row in rows),
            }
        )
    activity_rows = conn.execute(select(activities)).mappings().all()
    tasks = []
    for row in activity_rows:
        group = classify_follow_up(row["follow_up_date"], bool(row["done"]), today)
        if group is None:
            continue
        record_type = "contact" if row["contact_id"] else "deal"
        record_id = row["contact_id"] or row["deal_id"]
        tasks.append(
            {
                "id": row["id"],
                "description": row["description"],
                "follow_up_date": row["follow_up_date"],
                "done": bool(row["done"]),
                "group": group,
                "record_type": record_type,
                "record_id": record_id,
                "record_name": _record_name(conn, record_type, record_id),
            }
        )
    overdue = sorted(
        [task for task in tasks if task["group"] == "overdue"],
        key=lambda task: (task["follow_up_date"], task["id"]),
    )
    upcoming = sorted(
        [task for task in tasks if task["group"] == "upcoming"],
        key=lambda task: (task["follow_up_date"], task["id"]),
    )
    return {
        "today": today.isoformat(),
        "open_pipeline_cents": open_pipeline,
        "expected_cents": expected,
        "won_this_month_cents": sum(row["value_cents"] for row in won_rows),
        "won_this_month_count": len(won_rows),
        "overdue_count": len(overdue),
        "months": months,
        "open_stages": open_stages,
        "tasks": tasks,
        "overdue": overdue,
        "upcoming": upcoming,
        "recent": recent_activity(conn),
    }


def _record_name(conn, record_type: str, record_id: int) -> str:
    if record_type == "contact":
        row = conn.execute(select(contacts.c.name).where(contacts.c.id == record_id)).first()
    else:
        row = conn.execute(select(deals.c.name).where(deals.c.id == record_id)).first()
    return row[0] if row else ""


def recent_activity(conn, limit: int = 10) -> list[dict]:
    rows = []
    for row in conn.execute(select(activities)).mappings().all():
        record_type = "contact" if row["contact_id"] else "deal"
        record_id = row["contact_id"] or row["deal_id"]
        rows.append(
            {
                "kind": "activity",
                "id": row["id"],
                "happened_at": row["happened_at"],
                "title": row["type"],
                "detail": row["description"],
                "record_type": record_type,
                "record_id": record_id,
                "record_name": _record_name(conn, record_type, record_id),
            }
        )
    for row in conn.execute(select(stage_entries)).mappings().all():
        rows.append(
            {
                "kind": "stage",
                "id": row["id"],
                "happened_at": row["happened_at"],
                "title": row["text"],
                "detail": "",
                "record_type": "deal",
                "record_id": row["deal_id"],
                "record_name": _record_name(conn, "deal", row["deal_id"]),
            }
        )
    rows.sort(key=lambda item: (item["happened_at"], item["kind"], item["id"]), reverse=True)
    return rows[:limit]
