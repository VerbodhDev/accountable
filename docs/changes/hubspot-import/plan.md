# Plan: import from HubSpot

The import lives in the CRM area. That area already owns the organization, contact and deal tables, their rules and their schemas, and the import must add records through exactly those. The CRM is a first area, so it may import its own modules, and the layout test needs no change. No migration: the import matches by name and email and adds no column.

## The four questions first

| Question | Answer | Proved by |
|---|---|---|
| **Auth:** who may call it, and where is it checked? | Any signed-in person, by the shared dependency on every `/api` route (I21). | A test per route: no token gets 401 (`test_every_route.py` covers the new routes, and `test_import.py` names them). |
| **Tenancy:** whose data does it read or change? | The team's organizations, contacts and deals. There is one team. The reply holds counts and the person's own rows, and never a field of a record already in Accountable. | A test: a preview of a file that matches existing records returns counts, and no name or email of those records beyond what the file itself held. |
| **Isolation:** what can it reach beyond its job? | Nothing outside the request. No file path, no network, no disk write. The file is text in memory, capped at 2 MB, 2,000 rows and 400 columns. | Hostile files: a NUL, half a two-part character, binary, a cell starting with `=`, a cell of 100,000 characters, 10,000 rows, 1,000 columns, a ragged row. Each is refused or stored as text, with no 500. |
| **Secrets:** which keys does it touch? | None. A log line holds the kind, the counts and the person, and never a cell. | A test with `caplog`: after an import, no log line holds a value from the file. |

Trust boundaries (C1): the file's text (anyone who can sign in controls it), the `save` flag (the person), and the HubSpot cell formats (HubSpot controls them, and the importer treats them as untrusted). The checks are in `hubspot.py` for the format and in the existing schemas for each value.

## Files that change

Backend, all new except the two edited:

- `backend/accountable/crm/hubspot.py`. The pure part, with no database. It reads the CSV text with the standard library, strips a byte-order mark, finds the columns by name, maps a row to the fields of an organization, a contact or a deal, and holds the maps: the seven deal stages (I14), the lifecycle stages (I12), the amount and the date rules (I15), and the reading of the Associated Contact cell (I16). Each rejection is a plain reason with its row number.
- `backend/accountable/crm/importer.py`. Takes a database connection, the kind and the rows. It loads the names, the emails and the deal keys once into dictionaries, classifies every row as new, already there or rejected (I7, I8), and with `save` adds the new ones. It validates each record with the CRM's own schemas and turns a failure into the schemas' message by `api.field_messages`. It adds records with the same inserts the routers use, and a deal through `rules.add_deal`, so a Won deal makes its contact a customer (I4).
- `backend/accountable/crm/routers/imports.py`. Three routes under `/imports`: companies, contacts and deals. Each takes `csv` and `save`. A preview reads inside `db.reading()`. A save classifies and writes inside one `db.writing()`, so the rows are judged against the same state they are added to, and a failure keeps none of them (I3, I22).
- `backend/accountable/crm/schemas.py`. The request and reply models for the three routes, and a `csv` message in `FIELD_MESSAGES` for the size limit.
- `backend/accountable/main.py`. The CRM's `Area` gains the imports router.

Backend tests (written first, each seen failing):

- `backend/tests/hubspot_files.py`. Builds made-up files in the three HubSpot shapes, with the columns seen in the real exports. No real record.
- `backend/tests/test_hubspot.py`. The parsing and the maps: every lifecycle stage, every deal stage in any case, amounts, dates, the Associated Contact cell with brackets in the name, a byte-order mark, quoted commas, line breaks inside a cell, a missing column.
- `backend/tests/test_import.py`. Each kind: preview counts, save, the same file twice, a repeat inside a file, rejections with their reasons, added companies and contacts, a Won deal making a customer, who added each record, all-or-nothing, and the 401s.
- `backend/tests/test_import_limits.py`. The hostile files above, and a 2,000-row file of each kind previewed and saved within a time bound.
- `backend/tests/test_every_route.py`. A sample body for each new route, and the assertion that they exist.
- `backend/tests/test_layout.py`. The CRM's route words now include `imports`.

Frontend:

- `frontend/src/imports/ImportPage.tsx` and its test. The page of I23 to I28.
- `frontend/src/imports/queries.ts` and its test. One mutation for the preview and the save.
- `frontend/src/App.tsx`. The `/import` route.
- `frontend/src/components/UserMenu.tsx`. An Import link after Company settings (N7).
- Tests that state the menu or the addresses, found by search at build time. The first search, for Company settings, lists UserMenu.test.tsx, Shell.test.tsx, App.test.tsx, e2e/menu.spec.ts, e2e/quality.spec.ts and e2e/settings.spec.ts. A second search covers `layout.test.ts` and any list of addresses.
- `e2e/import.spec.ts`. New. Imports a made-up companies file, then contacts, then deals, through the page, and checks the lists, the board and a second import that adds nothing.

Docs:

- `docs/specs/architecture.md`. The new files in the tree.
- `docs/specs/testing.md`. The new tests.
- `docs/specs/frontend.md`. The import page's place.
- `docs/STATUS.md`. When done.

What stays as it is: the existing routes and their replies, the sample data, the Copilot, the books, and every table. To revert: delete the new files and the three edits. Nothing in the database needs undoing, and the records already imported stay, because they are ordinary records.

## Order of work

1. `hubspot.py` with `test_hubspot.py`: the format, the maps and the rejections, no database.
2. Companies: `importer.py`, the router and the preview, then the save, with their tests. The two layout and route-table tests change here.
3. Contacts, with the added companies.
4. Deals, with the added companies and contacts, the stage map and the Won rule.
5. The hostile and limit tests.
6. The page, the route and the menu link, with their tests.
7. `e2e/import.spec.ts`, and the tests that name the menu.
8. The docs. Then `npm run check`.
9. In a browser on a temporary database: import the real sample files in docs/ through the page, light and dark mode, and the refusals.

## Risks

- **HubSpot changes its export.** The importer finds columns by name, ignores the rest, and refuses a file that lacks a needed one with the names. A new column cannot break it.
- **A file in another encoding.** The browser reads the file as UTF-8. A file saved in a Windows encoding shows odd characters and is not detected. The page's help line says to export as CSV from HubSpot, which gives UTF-8.
- **A large save holds the write lock.** At 2,000 rows it is one short transaction. The time bound in `test_import_limits.py` watches it.
- **The tests that count menu items or addresses.** A new menu link changes them. They are found by search first and listed here.
- **A real name slipping into a test.** All test files are built from made-up values. The real sample files are only opened by hand in step 9.

## Proof

- `npm run check` passes.
- Each new test is seen failing before the code that makes it pass.
- In a browser, on a temporary database: the companies, contacts and deals sample files from docs/ preview and save, the board shows the deal, a second import adds nothing, and a refused file shows its message. Screenshots in light and dark mode.
- A signed-out request to each route gets 401.
