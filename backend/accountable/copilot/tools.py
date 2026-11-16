"""The Copilot's tools. Each one calls Accountable's own API. None opens the database.

A name that is not in this list is not a tool. Deletes, company settings, users and
journal writes are left out on purpose (Z4).
"""

import json
import re
from dataclasses import dataclass
from typing import Any

import httpx

STAGE_LABELS = {
    "new": "New",
    "qualified": "Qualified",
    "proposal": "Proposal",
    "negotiation": "Negotiation",
    "won": "Won",
    "lost": "Lost",
}


@dataclass(frozen=True)
class Tool:
    name: str
    method: str
    path: str
    write: bool
    line: str
    description: str
    input_schema: dict[str, Any]


@dataclass(frozen=True)
class Outcome:
    status: int
    body: object


def _schema(properties: dict[str, Any] | None = None, required: list[str] | None = None) -> dict[str, Any]:
    schema: dict[str, Any] = {"type": "object", "properties": properties or {}}
    if required:
        schema["required"] = required
    return schema


def _tool(
    name: str,
    method: str,
    path: str,
    write: bool,
    line: str,
    description: str,
    schema: dict[str, Any] | None = None,
) -> Tool:
    return Tool(name, method, path, write, line, description, schema or _schema())


_READ = False
_WRITE = True

# Reads first, then the writes the app already allows. The path is the API's own path.
CATALOG: tuple[Tool, ...] = (
    _tool(
        "search",
        "GET",
        "/api/search",
        _READ,
        "Searching",
        "Search organizations, contacts, deals and products.",
        _schema({"q": {"type": "string"}}, ["q"]),
    ),
    _tool("list_organizations", "GET", "/api/organizations", _READ, "Looking up organizations", "List organizations."),
    _tool(
        "read_organization",
        "GET",
        "/api/organizations/{organization_id}",
        _READ,
        "Looking up an organization",
        "Read one organization.",
        _schema({"organization_id": {"type": "integer"}}, ["organization_id"]),
    ),
    _tool("list_contacts", "GET", "/api/contacts", _READ, "Looking up contacts", "List contacts."),
    _tool(
        "read_contact",
        "GET",
        "/api/contacts/{contact_id}",
        _READ,
        "Looking up a contact",
        "Read one contact.",
        _schema({"contact_id": {"type": "integer"}}, ["contact_id"]),
    ),
    _tool(
        "list_deals",
        "GET",
        "/api/deals",
        _READ,
        "Looking up deals",
        "List deals. Set closing to this_month to keep the deals whose close date is this month.",
        _schema({"closing": {"type": "string", "enum": ["this_month"]}}),
    ),
    _tool(
        "read_deal",
        "GET",
        "/api/deals/{deal_id}",
        _READ,
        "Looking up a deal",
        "Read one deal.",
        _schema({"deal_id": {"type": "integer"}}, ["deal_id"]),
    ),
    _tool(
        "deal_timeline",
        "GET",
        "/api/deals/{deal_id}/timeline",
        _READ,
        "Looking up a deal's activity",
        "Read a deal's notes and activity.",
        _schema({"deal_id": {"type": "integer"}}, ["deal_id"]),
    ),
    _tool(
        "contact_timeline",
        "GET",
        "/api/contacts/{contact_id}/timeline",
        _READ,
        "Looking up a contact's activity",
        "Read a contact's notes and activity.",
        _schema({"contact_id": {"type": "integer"}}, ["contact_id"]),
    ),
    _tool(
        "organization_timeline",
        "GET",
        "/api/organizations/{organization_id}/timeline",
        _READ,
        "Looking up an organization's activity",
        "Read an organization's notes and activity.",
        _schema({"organization_id": {"type": "integer"}}, ["organization_id"]),
    ),
    _tool("list_products", "GET", "/api/products", _READ, "Looking up products", "List products."),
    _tool(
        "read_product",
        "GET",
        "/api/products/{product_id}",
        _READ,
        "Looking up a product",
        "Read one product.",
        _schema({"product_id": {"type": "integer"}}, ["product_id"]),
    ),
    _tool("list_quotes", "GET", "/api/quotes", _READ, "Looking up quotes", "List quotes."),
    _tool(
        "read_quote",
        "GET",
        "/api/quotes/{quote_id}",
        _READ,
        "Looking up a quote",
        "Read one quote.",
        _schema({"quote_id": {"type": "integer"}}, ["quote_id"]),
    ),
    _tool("list_invoices", "GET", "/api/invoices", _READ, "Looking up invoices", "List invoices."),
    _tool(
        "read_invoice",
        "GET",
        "/api/invoices/{invoice_id}",
        _READ,
        "Looking up an invoice",
        "Read one invoice, including its payments.",
        _schema({"invoice_id": {"type": "integer"}}, ["invoice_id"]),
    ),
    _tool("list_bills", "GET", "/api/bills", _READ, "Looking up bills", "List bills."),
    _tool(
        "read_bill",
        "GET",
        "/api/bills/{bill_id}",
        _READ,
        "Looking up a bill",
        "Read one bill.",
        _schema({"bill_id": {"type": "integer"}}, ["bill_id"]),
    ),
    _tool(
        "dashboard", "GET", "/api/dashboard", _READ, "Looking up the dashboard", "Read the dashboard, including money."
    ),
    _tool("cash_flow", "GET", "/api/cash-flow", _READ, "Looking up cash flow", "Read the cash flow."),
    _tool(
        "journal",
        "GET",
        "/api/books/entries",
        _READ,
        "Looking up the journal",
        "Read the journal. This does not post an entry.",
    ),
    _tool(
        "ledger",
        "GET",
        "/api/books/accounts/{key}/ledger",
        _READ,
        "Looking up a ledger",
        "Read one account's ledger.",
        _schema({"key": {"type": "string"}}, ["key"]),
    ),
    _tool(
        "aged_customers",
        "GET",
        "/api/aged-balances/customers",
        _READ,
        "Looking up what customers owe",
        "Read aged balances for customers.",
    ),
    _tool(
        "aged_suppliers",
        "GET",
        "/api/aged-balances/suppliers",
        _READ,
        "Looking up what we owe suppliers",
        "Read aged balances for suppliers.",
    ),
    _tool(
        "profit_and_loss",
        "GET",
        "/api/books/profit-and-loss",
        _READ,
        "Looking up profit and loss",
        "Read the profit and loss.",
    ),
    _tool(
        "balance_sheet", "GET", "/api/books/balances", _READ, "Looking up the balance sheet", "Read the balance sheet."
    ),
    _tool(
        "move_deal",
        "POST",
        "/api/deals/{deal_id}/move",
        _WRITE,
        "Move a deal",
        "Move one deal to another stage.",
        _schema(
            {
                "deal_id": {"type": "integer"},
                "stage": {"type": "string", "enum": list(STAGE_LABELS)},
                "before_deal_id": {"type": "integer"},
            },
            ["deal_id", "stage"],
        ),
    ),
    _tool(
        "add_activity",
        "POST",
        "/api/activities",
        _WRITE,
        "Add a note",
        "Add one note or activity on a contact or a deal.",
        _schema(),
    ),
    _tool("create_quote", "POST", "/api/quotes", _WRITE, "Create a quote", "Create a quote.", _schema()),
    _tool(
        "update_quote",
        "PATCH",
        "/api/quotes/{quote_id}",
        _WRITE,
        "Update a quote",
        "Update a quote.",
        _schema({"quote_id": {"type": "integer"}}, ["quote_id"]),
    ),
    _tool(
        "send_quote",
        "POST",
        "/api/quotes/{quote_id}/send",
        _WRITE,
        "Send the quote",
        "Send a draft quote.",
        _schema({"quote_id": {"type": "integer"}}, ["quote_id"]),
    ),
    _tool(
        "decline_quote",
        "POST",
        "/api/quotes/{quote_id}/decline",
        _WRITE,
        "Decline the quote",
        "Decline a quote.",
        _schema({"quote_id": {"type": "integer"}}, ["quote_id"]),
    ),
    _tool(
        "accept_quote",
        "POST",
        "/api/quotes/{quote_id}/accept",
        _WRITE,
        "Accept the quote",
        "Accept a sent quote.",
        _schema({"quote_id": {"type": "integer"}}, ["quote_id"]),
    ),
    _tool(
        "copy_quote",
        "POST",
        "/api/quotes/{quote_id}/copy",
        _WRITE,
        "Copy the quote",
        "Copy a quote to a new draft.",
        _schema({"quote_id": {"type": "integer"}}, ["quote_id"]),
    ),
    _tool("create_invoice", "POST", "/api/invoices", _WRITE, "Create an invoice", "Create an invoice.", _schema()),
    _tool(
        "update_invoice",
        "PATCH",
        "/api/invoices/{invoice_id}",
        _WRITE,
        "Update an invoice",
        "Update an invoice.",
        _schema({"invoice_id": {"type": "integer"}}, ["invoice_id"]),
    ),
    _tool(
        "issue_invoice",
        "POST",
        "/api/invoices/{invoice_id}/issue",
        _WRITE,
        "Issue the invoice",
        "Issue an invoice.",
        _schema({"invoice_id": {"type": "integer"}}, ["invoice_id"]),
    ),
    _tool(
        "void_invoice",
        "POST",
        "/api/invoices/{invoice_id}/void",
        _WRITE,
        "Void the invoice",
        "Void an invoice.",
        _schema({"invoice_id": {"type": "integer"}}, ["invoice_id"]),
    ),
    _tool(
        "invoice_from_quote",
        "POST",
        "/api/invoices/from-quote/{quote_id}",
        _WRITE,
        "Create an invoice from the quote",
        "Create an invoice from an accepted quote.",
        _schema({"quote_id": {"type": "integer"}}, ["quote_id"]),
    ),
    _tool(
        "record_payment",
        "POST",
        "/api/invoices/{invoice_id}/payments",
        _WRITE,
        "Record a payment",
        "Record a payment on an issued invoice.",
        _schema({"invoice_id": {"type": "integer"}}, ["invoice_id"]),
    ),
    _tool("create_bill", "POST", "/api/bills", _WRITE, "Create a bill", "Create a bill.", _schema()),
    _tool(
        "update_bill",
        "PATCH",
        "/api/bills/{bill_id}",
        _WRITE,
        "Update a bill",
        "Update a bill.",
        _schema({"bill_id": {"type": "integer"}}, ["bill_id"]),
    ),
    _tool(
        "mark_bill_paid",
        "PATCH",
        "/api/bills/{bill_id}",
        _WRITE,
        "Mark the bill paid",
        "Mark a bill paid by setting paid_on.",
        _schema({"bill_id": {"type": "integer"}, "paid_on": {"type": "string"}}, ["bill_id", "paid_on"]),
    ),
)

TOOLS = {tool.name: tool for tool in CATALOG}


def find(name: str) -> Tool | None:
    return TOOLS.get(name)


def schemas() -> list[dict[str, Any]]:
    return [{"name": tool.name, "description": tool.description, "input_schema": tool.input_schema} for tool in CATALOG]


def spoken(tool: Tool, arguments: dict[str, Any]) -> str:
    if tool.name == "list_deals" and arguments.get("closing") == "this_month":
        return "Looking up deals closing this month"
    return tool.line


def move_line(deal: dict[str, Any], stage: str) -> str:
    label = STAGE_LABELS.get(stage, stage)
    name = str(deal.get("name") or "deal")
    organization = deal.get("organization_name")
    if isinstance(organization, str) and organization:
        return f"Move {organization}'s {name} deal to {label}"
    return f"Move the {name} deal to {label}"


def _json(response: httpx.Response) -> object:
    if response.status_code == 204 or not response.content:
        return None
    try:
        return response.json()
    except json.JSONDecodeError:
        return {"detail": response.text}


class Api:
    """Calls this same app as the signed-in user, with the request's own Authorization header."""

    def __init__(self, client: httpx.AsyncClient, authorization: str) -> None:
        self.client = client
        self.authorization = authorization

    async def run(self, tool: Tool, arguments: dict[str, Any]) -> Outcome:
        if tool.name == "list_deals" and arguments.get("closing") == "this_month":
            return await self._this_month()
        path, query, body = _parts(tool, arguments)
        if not path:
            return Outcome(400, {"detail": "That record no longer exists."})
        return await self.request(tool.method, path, query, body)

    async def request(
        self, method: str, path: str, query: dict[str, Any] | None, body: dict[str, Any] | None
    ) -> Outcome:
        kwargs: dict[str, Any] = {"headers": {"authorization": self.authorization}}
        if query:
            kwargs["params"] = query
        if method in {"POST", "PATCH", "PUT"}:
            kwargs["json"] = body or {}
        response = await self.client.request(method, path, **kwargs)
        return Outcome(response.status_code, _json(response))

    async def _this_month(self) -> Outcome:
        deals = await self.request("GET", "/api/deals", None, None)
        if deals.status >= 400 or not isinstance(deals.body, list):
            return deals
        board = await self.request("GET", "/api/dashboard", None, None)
        if board.status >= 400 or not isinstance(board.body, dict):
            return board
        month = str(board.body.get("today", ""))[:7]
        kept = [
            deal for deal in deals.body if isinstance(deal, dict) and str(deal.get("close_date", "")).startswith(month)
        ]
        return Outcome(200, kept)


def _parts(tool: Tool, arguments: dict[str, Any]) -> tuple[str, dict[str, Any], dict[str, Any]]:
    names = set(re.findall(r"{(\w+)}", tool.path))
    if not names <= set(arguments):
        return "", {}, {}
    path = tool.path.format(**{name: arguments[name] for name in names})
    rest = {key: value for key, value in arguments.items() if key not in names}
    if tool.method == "GET":
        return path, rest, {}
    return path, {}, rest


# A full deal list has to stay one JSON value, so a later step can still read the names.
_CAP = 100_000


def dumped(body: object) -> str:
    text = json.dumps(body)
    if len(text) <= _CAP:
        return text
    if isinstance(body, list):
        return _fitted(body)
    return text[:_CAP]


def _fitted(items: list[object]) -> str:
    kept: list[object] = []
    for item in items:
        if len(json.dumps([*kept, item])) > _CAP:
            return json.dumps(kept)
        kept.append(item)
    return json.dumps(kept)
