# Plan: Accountable for a catering company

The stored stage keys do not change, so there is no migration. The words the user reads change in one place on each side: the frontend's stage labels and the Copilot's stage labels. The company defaults and the sample data change in the backend's sample files.

## Files that change

- `frontend/src/crm/deals.ts`. The label of each stage: Enquiry, Tasting, Quote sent, Deposit due, Confirmed, Lost.
- `backend/accountable/copilot/tools.py` and `backend/accountable/copilot/loop.py`. The same labels, and catering words in the system prompt.
- `backend/accountable/company/sample_data.py`. The made-up caterer: name, address, email, phone, GST label and 9 percent, number prefixes, payment terms.
- `backend/accountable/crm/sample_data.py`, `products/sample_data.py`, `quotes/sample_data.py`, `invoices/sample_data.py`, `bills/sample_data.py` and `backend/accountable/sample.py`. Catering clients, events, a menu, quotes, invoices and supplier bills, all made up, with the same counts and the same shape as today so the dashboards still fill.
- Tests that state a stage label, a sample name or a sample figure. Found by search at build time. The first search lists 28 files: backend/tests/conftest.py, test_copilot.py, test_dashboard.py, test_quotes.py, test_timeline.py; e2e/activities, copilot, dashboard, pipeline, quotes, records and search specs; frontend/src/components/Search.test.tsx, copilot/Copilot.test.tsx, crm/Timeline.test.tsx, crm/board/Board.test.tsx, crm/charts/charts.test.tsx, crm/deals.test.ts, the Contact, Contacts, Dashboard, Deal, Deals, Organization and Pipeline page tests, lib/words.test.ts and test-utils.tsx. A second search by sample name adds the tests that state a name or a figure.
- `docs/spec.md`, `docs/specs/deals.md`, `docs/specs/records.md`, `docs/specs/dashboard.md`, `docs/specs/settings.md`, `docs/specs/copilot.md` and `docs/STATUS.md`. The stage names and the sample data.

## Order of work

1. The stage labels, with their tests. Run the frontend and Copilot tests.
2. The company defaults, with their tests.
3. The sample data, file by file. After each file, fix the tests that state its figures, then run that area's tests.
4. The Copilot wording.
5. The spec files and STATUS.
6. `npm run check`, then look at every section in a browser, in light and dark mode.

## Risks

- The dashboard, chart and total tests state exact sample figures. A new data set changes all of them. Mitigation: keep the counts and the date logic, change the names and the amounts together, and fix each test as the data changes.
- A stage word left in a place nobody searched. Mitigation: search for each old label and each old sample name at the end.
- Real names slipping in. Mitigation: the sample files keep their header that says every name is made up, and the last step searches the diff for any name from the owner's business or from the HubSpot sample records.

## Proof

- `npm run check` passes.
- A fresh local copy, looked at in a browser: the board, the deal pages, the dashboard, a quote's PDF, an invoice and the Copilot, in light and dark mode.
- A search of the repo for the old labels and the old sample names finds none.
