"""Importing companies, contacts and deals from HubSpot CSV files (I1 to I22)."""

import logging

from fastapi import APIRouter

from accountable import api, db
from accountable.auth import CurrentUser
from accountable.crm import hubspot, importer, schemas

log = logging.getLogger(__name__)

router = APIRouter(prefix="/imports")


def _run(kind: str, body: schemas.ImportRequest, user: str | None, today, now) -> schemas.ImportReply:
    try:
        table = hubspot.read_table(kind, body.csv)
    except hubspot.Refused as refused:
        raise api.FieldError({"csv": refused.message}) from None
    if body.save:
        with db.writing() as conn:
            result = importer.run(conn, kind, table, save=True, user=user, now=now, today=today)
    else:
        with db.reading() as conn:
            result = importer.run(conn, kind, table, save=False, user=user, now=now, today=today)
    # The kind, the counts and the person. Never a cell of the file (I20).
    log.info(
        "Import of %s by %s: %d new, %d existing, %d rejected, saved=%s",
        kind,
        user,
        result.new,
        result.existing,
        len(result.rejected),
        result.saved,
    )
    return schemas.ImportReply(
        counts=schemas.ImportCounts(
            new=result.new,
            existing=result.existing,
            rejected=len(result.rejected),
            companies_to_add=result.companies_to_add,
            contacts_to_add=result.contacts_to_add,
        ),
        rejected=[schemas.RejectedRow(row=row, reason=reason) for row, reason in result.rejected[: importer.LISTED]],
        rejected_more=max(0, len(result.rejected) - importer.LISTED),
        ignored_columns=result.ignored,
        saved=result.saved,
    )


@router.post("/deals")
def import_deals(body: schemas.ImportRequest, user: CurrentUser, today: api.Today, now: api.Now) -> schemas.ImportReply:
    return _run("deals", body, user, today, now)


@router.post("/contacts")
def import_contacts(
    body: schemas.ImportRequest, user: CurrentUser, today: api.Today, now: api.Now
) -> schemas.ImportReply:
    return _run("contacts", body, user, today, now)


@router.post("/companies")
def import_companies(
    body: schemas.ImportRequest, user: CurrentUser, today: api.Today, now: api.Now
) -> schemas.ImportReply:
    return _run("companies", body, user, today, now)
