The product is described in docs/spec.md. The chosen mockup is docs/mockups/figures.html. The MVP intent and plan are in docs/changes/mvp/. The plan traces spec IDs S01 to S86.

CRM code sits in the accountable.crm package. The database module sits beside it, so a later business area has a place to go.

Run npm run dev from the repo root. The site opens at http://127.0.0.1:5173. The API listens at http://127.0.0.1:8000. There is no password.

Run npm test to run pytest, Vitest, and Playwright. The command fails if any test fails. Playwright uses the installed Google Chrome and its own database file.

Run npm run seed to replace every row with the sample set. Seed does not ask first. A missing database is created and filled on the first start. A later start leaves the existing file as it is.

A review on 2026-11-14 found one bug and no nits. On a contact timeline, delete named the contact for a deal activity and for a stage entry. The dialog now names the deal. A stage entry says that deal stays in its current stage. On the deal page the dialog still names that deal and its stage.

On 2026-11-14 the docs were reorganized. docs/spec.md describes the product as it stands. The MVP intent and plan moved to docs/changes/mvp/. No application code changed.
