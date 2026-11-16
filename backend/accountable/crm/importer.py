"""Adding what a HubSpot file holds. A preview and a save run the same code, so they cannot disagree.

Every record is checked by the CRM's own schemas and added by the same inserts the routes use, so an
imported record follows the rules of one added by hand (I4). The names, emails and deals already
there are read once into dictionaries, so a file of 2,000 rows costs a few queries, not thousands.
"""

import logging
from dataclasses import dataclass, field
from datetime import date, datetime

from pydantic import BaseModel, ValidationError
from sqlalchemy import Connection, insert, select

from accountable import api, who
from accountable.crm import hubspot, rules, schemas
from accountable.crm.tables import contacts, deals, organizations

log = logging.getLogger(__name__)

LISTED = 100
SHOWN = 10


@dataclass
class Result:
    new: int = 0
    existing: int = 0
    rejected: list[tuple[int, str]] = field(default_factory=list)
    companies_to_add: int = 0
    contacts_to_add: int = 0
    shown: list[dict] = field(default_factory=list)
    ignored: list[str] = field(default_factory=list)
    saved: bool = False

    def reject(self, row: int, reason: str) -> None:
        self.rejected.append((row, reason))


def run(
    conn: Connection,
    kind: str,
    table: hubspot.Table,
    *,
    save: bool,
    user: str | None,
    now: datetime,
    today: date,
) -> Result:
    """Judges every row against what is in the database, and with save adds the new ones, all in this connection."""
    result = Result(ignored=table.ignored, saved=save)
    if kind == "companies":
        _companies(conn, table.rows, result, save=save, user=user, now=now)
    elif kind == "contacts":
        _contacts(conn, table.rows, result, save=save, user=user, now=now)
    elif kind == "deals":
        _deals(conn, table.rows, result, save=save, user=user, now=now, today=today)
    return result


def _key(name: str) -> str:
    """Names match with spaces at either end dropped and case ignored (I7)."""
    return name.strip().casefold()


def _reason(error: ValidationError) -> str:
    """The forms' own words for what is wrong with a record."""
    # The app's message lookup expects the place a route's body check gives, which starts with "body".
    errors = [{**problem, "loc": ("body", *problem["loc"])} for problem in error.errors()]
    return "; ".join(api.field_messages(errors, schemas.FIELD_MESSAGES).values())


def _valid[Model: BaseModel](model: type[Model], fields: dict, row: int, result: Result) -> Model | None:
    try:
        return model.model_validate(fields)
    except ValidationError as error:
        result.reject(row, _reason(error))
        return None


def add_organization(conn: Connection, model: schemas.OrganizationCreate, *, user: str | None, now: datetime) -> int:
    return conn.execute(
        insert(organizations).values(**model.model_dump(), **who.added(user, now)).returning(organizations.c.id)
    ).scalar_one()


def _companies(
    conn: Connection, rows: list[hubspot.Row], result: Result, *, save: bool, user: str | None, now: datetime
) -> None:
    known = {_key(name) for name in conn.scalars(select(organizations.c.name))}
    for row in rows:
        parsed = hubspot.company_fields(row.cells)
        if parsed.reason:
            result.reject(row.number, parsed.reason)
            continue
        model = _valid(schemas.OrganizationCreate, parsed.fields, row.number, result)
        if model is None:
            continue
        key = _key(model.name)
        if key in known:
            result.existing += 1
            continue
        known.add(key)
        result.new += 1
        if save:
            add_organization(conn, model, user=user, now=now)


class _Companies:
    """The organizations by name, and the ones this run adds. In a preview a new one has no id yet."""

    def __init__(self, conn: Connection) -> None:
        self.conn = conn
        self.ids: dict[str, int | None] = {}
        for organization_id, name in conn.execute(
            select(organizations.c.id, organizations.c.name).order_by(organizations.c.id)
        ):
            self.ids.setdefault(_key(name), organization_id)

    def ensure(self, name: str, *, save: bool, user: str | None, now: datetime) -> tuple[int | None, bool]:
        """The id of the organization with this name, adding it if it is missing. Also whether it was missing."""
        key = _key(name)
        if key in self.ids:
            return self.ids[key], False
        model = schemas.OrganizationCreate.model_validate({"name": name})
        self.ids[key] = add_organization(self.conn, model, user=user, now=now) if save else None
        return self.ids[key], True


def add_contact(
    conn: Connection, model: schemas.ContactCreate, organization_id: int | None, *, user: str | None, now: datetime
) -> int:
    values = {**model.model_dump(), "organization_id": organization_id}
    return conn.execute(insert(contacts).values(**values, **who.added(user, now)).returning(contacts.c.id)).scalar_one()


def _contacts(
    conn: Connection, rows: list[hubspot.Row], result: Result, *, save: bool, user: str | None, now: datetime
) -> None:
    companies = _Companies(conn)
    emails: set[str] = set()
    named: set[tuple[str, str]] = set()
    there = conn.execute(
        select(contacts.c.name, contacts.c.email, organizations.c.name).select_from(
            contacts.outerjoin(organizations, contacts.c.organization_id == organizations.c.id)
        )
    )
    for name, email, company in there:
        if email:
            emails.add(_key(email))
        named.add((_key(company or ""), _key(name)))
    for row in rows:
        parsed = hubspot.contact_fields(row.cells)
        if parsed.reason:
            result.reject(row.number, parsed.reason)
            continue
        fields = parsed.fields
        # The organization is set when the contact is added, so any id passes the schema's check here.
        model = _valid(schemas.ContactCreate, {**fields, "organization_id": 1}, row.number, result)
        if model is None:
            continue
        company_key = _key(fields["company"])
        email_key = _key(model.email) if model.email else None
        if email_key is not None:
            there_already = email_key in emails
        else:
            there_already = (company_key, _key(model.name)) in named
        if there_already:
            result.existing += 1
            continue
        organization_id, added = companies.ensure(fields["company"], save=save, user=user, now=now)
        result.companies_to_add += added
        if email_key is not None:
            emails.add(email_key)
        named.add((company_key, _key(model.name)))
        result.new += 1
        if save:
            add_contact(conn, model, organization_id, user=user, now=now)


def add_deal(conn: Connection, values: dict, *, today: date, now: datetime, user: str | None) -> int:
    """Through the CRM's rules, so a deal added as Won makes its main contact a customer (I4)."""
    return rules.add_deal(conn, values, today=today, now=now, user_id=user)


def _deals(
    conn: Connection,
    rows: list[hubspot.Row],
    result: Result,
    *,
    save: bool,
    user: str | None,
    now: datetime,
    today: date,
) -> None:
    companies = _Companies(conn)
    people: dict[str, int | None] = {}
    for contact_id, email in conn.execute(
        select(contacts.c.id, contacts.c.email).where(contacts.c.email.is_not(None)).order_by(contacts.c.id)
    ):
        people.setdefault(_key(email), contact_id)
    known = {
        (_key(company), _key(name))
        for name, company in conn.execute(
            select(deals.c.name, organizations.c.name).select_from(
                deals.join(organizations, deals.c.organization_id == organizations.c.id)
            )
        )
    }
    for row in rows:
        parsed = hubspot.deal_fields(row.cells, today)
        if parsed.reason:
            result.reject(row.number, parsed.reason)
            continue
        fields = parsed.fields
        # The links are set when the deal is added, so any ids pass the schema's check here.
        deal = _valid(
            schemas.DealCreate,
            {
                "name": fields["name"],
                "stage": fields["stage"],
                "value": fields["value"],
                "close_date": fields["close_date"],
                "organization_id": 1,
                "main_contact_id": 1,
            },
            row.number,
            result,
        )
        if deal is None:
            continue
        person = _valid(
            schemas.ContactCreate,
            {"name": fields["contact_name"], "email": fields["contact_email"], "organization_id": 1},
            row.number,
            result,
        )
        if person is None:
            continue
        key = (_key(fields["company"]), _key(deal.name))
        if key in known:
            result.existing += 1
            continue
        known.add(key)
        organization_id, added = companies.ensure(fields["company"], save=save, user=user, now=now)
        result.companies_to_add += added
        email_key = _key(person.email or "")
        if email_key in people:
            contact_id = people[email_key]
        else:
            contact_id = add_contact(conn, person, organization_id, user=user, now=now) if save else None
            people[email_key] = contact_id
            result.contacts_to_add += 1
        result.new += 1
        if len(result.shown) < SHOWN:
            result.shown.append(
                {
                    "row": row.number,
                    "name": deal.name,
                    "stage": rules.STAGE_NAMES[deal.stage],
                    "value": deal.value,
                    "amount": fields["amount"],
                    "rounded": fields["rounded"],
                }
            )
        if save:
            values = {**deal.model_dump(), "organization_id": organization_id, "main_contact_id": contact_id}
            add_deal(conn, values, today=today, now=now, user=user)
