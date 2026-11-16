"""Reading a HubSpot export. Text goes in and rows come out, with no database.

The columns are the ones seen in real exports of a free account, found by name, so a column
HubSpot adds cannot break the reading. The file is untrusted: it is checked for size, rows,
columns and NUL characters before any row is read, and each cell is data and nothing else.
"""

import csv
import io
import re
from dataclasses import dataclass, field
from datetime import date
from decimal import ROUND_HALF_UP, Decimal, InvalidOperation
from typing import Any

MAX_BYTES = 2 * 1024 * 1024
MAX_ROWS = 2000
MAX_COLUMNS = 400

TOO_LARGE = "This file is too large. Split it into files of 2,000 rows or fewer."
TOO_MANY_COLUMNS = "This file has too many columns. A HubSpot export has fewer than 400."
NOT_TEXT = "This is not a text file. Export it from HubSpot as a CSV file."
UNREADABLE = "This file could not be read as CSV."
EMPTY = "This file is empty."
LOOKS_LIKE_CONTACTS = "This looks like a contacts file, not a companies file. Choose Contacts above."
DEAL_HINT = (
    "To export deals, open Customize in HubSpot's Export window, and under Properties included in export "
    "choose All properties and all associations on records."
)

BYTE_ORDER_MARK = chr(0xFEFF)

# The columns a file must have, then the ones it may have, for each kind.
NEEDED = {
    "companies": ["Company name"],
    "contacts": ["First Name", "Last Name", "Company Name"],
    "deals": [
        "Deal Name",
        "Deal Stage",
        "Amount",
        "Close Date",
        "Associated Company (Primary)",
        "Associated Contact",
        "Number of Associated Contacts",
    ],
}
ALSO = {
    "companies": ["Industry", "Phone Number", "City", "Country/Region"],
    "contacts": ["Email", "Phone Number", "Lifecycle Stage"],
    "deals": [],
}

# HubSpot's default sales pipeline, in its documentation. Labels are compared ignoring case.
DEAL_STAGES = {
    "appointment scheduled": "new",
    "qualified to buy": "qualified",
    "presentation scheduled": "proposal",
    "decision maker bought-in": "negotiation",
    "contract sent": "negotiation",
    "closed won": "won",
    "closed lost": "lost",
}
# Every other lifecycle stage, and a blank one, is a lead.
LIFECYCLE = {
    "customer": "customer",
    "opportunity": "qualified",
    "marketing qualified lead": "qualified",
    "sales qualified lead": "qualified",
}
CLOSED_STAGES = ("won", "lost")

# Beyond any deal's value, so the schema's own limit rejects it with its own message.
AMOUNT_CAP = Decimal(10**13)
# A date, and after it, if there is anything, a time that starts with hours and minutes.
DATE_AND_TIME = re.compile(r"(\d{4}-\d{2}-\d{2})(?:[ T]\d{2}:\d{2}.*)?", re.DOTALL)
MAX_CONTACT_CELL = 500
# What may stand between the last pair of brackets of the Associated Contact cell: an address, and nothing else.
EMAIL_IN_BRACKETS = re.compile(r"[^()\s]+@[^()\s]+")


class Refused(Exception):
    """A whole file turned away, with the words for the person."""

    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


@dataclass(frozen=True)
class Row:
    number: int
    cells: dict[str, str]


@dataclass(frozen=True)
class Table:
    rows: list[Row]
    ignored: list[str]


@dataclass(frozen=True)
class Parsed:
    """The fields of one record, or the reason the row is rejected."""

    fields: dict[str, Any] = field(default_factory=dict)
    reason: str | None = None


def reject(reason: str) -> Parsed:
    return Parsed(reason=reason)


def _names(missing: list[str]) -> str:
    return missing[0] if len(missing) == 1 else f"{', '.join(missing[:-1])} and {missing[-1]}"


def _missing_message(kind: str, missing: list[str]) -> str:
    noun = "column" if len(missing) == 1 else "columns"
    message = f"This is not a HubSpot {kind} file. It has no {_names(missing)} {noun}."
    return f"{message} {DEAL_HINT}" if kind == "deals" else message


def read_table(kind: str, text: str) -> Table:
    """The rows of a file, keyed by the columns the import uses. Row 1 is the header, as in a spreadsheet."""
    if "\x00" in text:
        raise Refused(NOT_TEXT)
    if len(text.encode("utf-8", errors="replace")) > MAX_BYTES:
        raise Refused(TOO_LARGE)
    text = text.removeprefix(BYTE_ORDER_MARK)
    try:
        records = csv.reader(io.StringIO(text, newline=""))
        header = next(records, None)
        if header is None or not any(name.strip() for name in header):
            raise Refused(EMPTY)
        if len(header) > MAX_COLUMNS:
            raise Refused(TOO_MANY_COLUMNS)
        columns = _columns(kind, header)
        rows = _rows(records, columns)
    except csv.Error:
        raise Refused(UNREADABLE) from None
    used = {name.casefold() for name in columns}
    ignored = [name.strip() for name in header if name.strip() and name.strip().casefold() not in used]
    return Table(rows, ignored)


def _columns(kind: str, header: list[str]) -> dict[str, int]:
    """Where each used column is, under the name this module uses for it."""
    found: dict[str, int] = {}
    for index, name in enumerate(header):
        found.setdefault(name.strip().casefold(), index)
    missing = [name for name in NEEDED[kind] if name.casefold() not in found]
    if missing:
        raise Refused(_missing_message(kind, missing))
    # A contacts file has a Company Name column too, so it would pass for companies without this.
    if kind == "companies" and {"first name", "last name"} <= found.keys():
        raise Refused(LOOKS_LIKE_CONTACTS)
    return {name: found[name.casefold()] for name in [*NEEDED[kind], *ALSO[kind]] if name.casefold() in found}


def _rows(records: Any, columns: dict[str, int]) -> list[Row]:
    rows: list[Row] = []
    for number, record in enumerate(records, start=2):
        if not any(cell.strip() for cell in record):
            continue
        if len(rows) == MAX_ROWS:
            raise Refused(TOO_LARGE)
        cells = {name: (record[index].strip() if index < len(record) else "") for name, index in columns.items()}
        rows.append(Row(number, cells))
    return rows


def company_fields(cells: dict[str, str]) -> Parsed:
    name = cells.get("Company name", "").strip()
    if not name:
        return reject("Enter a name")
    lines = [
        f"{label}: {value}"
        for label, column in (("Phone", "Phone Number"), ("City", "City"), ("Country/Region", "Country/Region"))
        if (value := cells.get(column, "").strip())
    ]
    industry = cells.get("Industry", "").strip() or None
    return Parsed({"name": name, "industry": industry, "notes": "\n".join(lines) or None})


def contact_fields(cells: dict[str, str]) -> Parsed:
    name = " ".join(part for part in (cells.get("First Name", "").strip(), cells.get("Last Name", "").strip()) if part)
    if not name:
        return reject("Enter a name")
    company = cells.get("Company Name", "").strip()
    if not company:
        return reject("Choose an organization")
    stage = cells.get("Lifecycle Stage", "").strip().casefold()
    return Parsed(
        {
            "name": name,
            "company": company,
            "email": cells.get("Email", "").strip() or None,
            "phone": cells.get("Phone Number", "").strip() or None,
            "status": LIFECYCLE.get(stage, "lead"),
        }
    )


def _amount(text: str) -> int | str:
    """Whole dollars, or the reason the amount cannot be read."""
    if not text:
        return "No amount"
    try:
        amount = Decimal(text)
    except InvalidOperation:
        return "Amount is not a number"
    if not amount.is_finite():
        return "Amount is not a number"
    amount = max(-AMOUNT_CAP, min(AMOUNT_CAP, amount))
    return int(amount.quantize(Decimal(1), rounding=ROUND_HALF_UP))


def _close_date(text: str) -> date | str:
    """The date as written, without the time, or the reason it cannot be read."""
    if not text:
        return "No close date"
    found = DATE_AND_TIME.fullmatch(text)
    if found is None:
        return "Close Date is not a date"
    try:
        return date.fromisoformat(found[1])
    except ValueError:
        return "Close Date is not a date"


def _contact_count(text: str) -> str | None:
    """The reason a deal does not have exactly one contact, or None when it does."""
    if not text:
        return "No contact"
    try:
        count = Decimal(text)
    except InvalidOperation:
        return "Number of Associated Contacts is not a number"
    if not count.is_finite():
        return "Number of Associated Contacts is not a number"
    if count < 1:
        return "No contact"
    if count > 1:
        return "More than one contact. Accountable keeps one main contact."
    return None


def _contact_cell(cell: str) -> tuple[str, str] | None:
    """The name and the email of "Name (email)", read from the last bracket, or None when there is no email.

    A name can hold brackets too, so only the last pair counts. This looks for characters one time each, so a
    hostile cell cannot make it slow the way a pattern with a lazy prefix and optional spaces can.
    """
    if not cell.endswith(")"):
        return None
    opening = cell.rfind("(")
    email = cell[opening + 1 : -1].strip()
    if not EMAIL_IN_BRACKETS.fullmatch(email):
        return None
    return cell[:opening].strip(), email


def deal_fields(cells: dict[str, str], today: date) -> Parsed:
    """The first check that fails is the reason, in the order of the spec's table (I13)."""
    name = cells.get("Deal Name", "").strip()
    if not name:
        return reject("Enter a name")
    label = cells.get("Deal Stage", "").strip()
    stage = DEAL_STAGES.get(label.casefold())
    if stage is None:
        return reject(f'Stage "{label}" is not one of the seven HubSpot deal stages')
    amount = cells.get("Amount", "").strip()
    value = _amount(amount)
    if isinstance(value, str):
        return reject(value)
    close_date = _close_date(cells.get("Close Date", "").strip())
    if isinstance(close_date, str):
        return reject(close_date)
    if stage in CLOSED_STAGES and close_date > today:
        return reject("A won or lost deal can't close in the future")
    company = cells.get("Associated Company (Primary)", "").strip()
    if not company:
        return reject("No company")
    problem = _contact_count(cells.get("Number of Associated Contacts", "").strip())
    if problem:
        return reject(problem)
    cell = cells.get("Associated Contact", "").strip()
    if len(cell) > MAX_CONTACT_CELL:
        return reject("The contact cell is too long")
    found = _contact_cell(cell)
    if found is None:
        return reject("The contact has no email, so it cannot be matched")
    if not found[0]:
        return reject("The contact has no name")
    return Parsed(
        {
            "name": name,
            "stage": stage,
            "value": value,
            "amount": amount,
            "rounded": Decimal(amount) != value,
            "close_date": close_date,
            "company": company,
            "contact_name": found[0],
            "contact_email": found[1],
        }
    )
