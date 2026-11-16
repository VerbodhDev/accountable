"""Made-up HubSpot export files, in the shapes of real exports. No real record is in here.

The columns are the ones seen in exports of a free account. A file can hold more columns than the
import reads, in any order, so each builder takes a header, and the default one has some the import ignores.
"""

import csv
import io

BYTE_ORDER_MARK = chr(0xFEFF)

COMPANIES_HEADER = [
    "Record ID",
    "Company name",
    "Company owner",
    "Create Date",
    "Phone Number",
    "Last Activity Date",
    "City",
    "Country/Region",
    "Industry",
]
CONTACTS_HEADER = [
    "Record ID",
    "First Name",
    "Last Name",
    "Email",
    "Phone Number",
    "Company Name",
    "Lead Status",
    "Lifecycle Stage",
    "Buying Role",
    "Contact owner",
]
# HubSpot's default deal export: no association columns.
DEALS_DEFAULT_HEADER = ["Record ID", "Deal Name", "Deal Stage", "Amount", "Close Date", "Next Activity", "Deal owner"]
# The export with All properties and all associations on records, cut down to the columns that matter.
DEALS_HEADER = [
    "Record ID",
    "Amount",
    "Close Date",
    "Create Date",
    "Deal Name",
    "Deal Stage",
    "Number of Associated Contacts",
    "Pipeline",
    "Associated Company (Primary)",
    "Associated Contact",
    "Associated Company",
    "Associated Company IDs",
    "Associated Contact IDs",
]


def csv_text(header: list[str], rows: list[dict[str, str]], *, bom: bool = False, newline: str = "\r\n") -> str:
    """A CSV file's text. A row names only the columns it fills, and the rest are blank."""
    out = io.StringIO()
    writer = csv.writer(out, lineterminator=newline)
    writer.writerow(header)
    for row in rows:
        writer.writerow([row.get(name, "") for name in header])
    return (BYTE_ORDER_MARK if bom else "") + out.getvalue()


def companies(*rows: dict[str, str], header: list[str] = COMPANIES_HEADER, **options) -> str:
    return csv_text(header, list(rows), **options)


def contacts(*rows: dict[str, str], header: list[str] = CONTACTS_HEADER, **options) -> str:
    return csv_text(header, list(rows), **options)


def deals(*rows: dict[str, str], header: list[str] = DEALS_HEADER, **options) -> str:
    return csv_text(header, list(rows), **options)


def company(name: str, **more: str) -> dict[str, str]:
    return {"Record ID": "1001", "Company name": name, **more}


def contact(first: str, last: str, company_name: str, **more: str) -> dict[str, str]:
    return {"Record ID": "2001", "First Name": first, "Last Name": last, "Company Name": company_name, **more}


def deal(
    name: str, stage: str, amount: str, close: str, company_name: str, contact_cell: str, **more: str
) -> dict[str, str]:
    return {
        "Record ID": "3001",
        "Deal Name": name,
        "Deal Stage": stage,
        "Amount": amount,
        "Close Date": close,
        "Associated Company (Primary)": company_name,
        "Associated Contact": contact_cell,
        "Number of Associated Contacts": "1.0",
        **more,
    }
