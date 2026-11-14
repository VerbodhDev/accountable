The product is described in docs/spec.md. The chosen mockup is docs/mockups/figures.html. The MVP intent and plan are in docs/changes/mvp/. The plan traces spec IDs S01 to S86.

CRM code sits in the accountable.crm package. The database module sits beside it, so a later business area has a place to go.

Run npm run dev from the repo root. The site opens at http://127.0.0.1:5173. The API listens at http://127.0.0.1:8000. There is no password.

Run npm run check before calling work finished. It runs Prettier, ESLint, ruff format, ruff check, tsc, ty, and gitleaks, then pytest, Vitest, and Playwright. Unit coverage must be at least 80 percent. The command fails if any check fails. npm run check:quick skips Playwright. npm run format fixes formatting. npm test still runs the three test suites. Playwright uses the installed Google Chrome and its own database file. Coverage is enforced by npm run check.

ESLint warns on TanStack Table's useReactTable. The table stays, because the product uses that library. The warning does not fail the check.

A lefthook pre-commit hook formats the staged files, then runs ESLint, ruff check, tsc, ty, and gitleaks. It skips the tests. npm install sets the hook up. Grok hooks in .grok/hooks run npm run check:quick when a turn ends. A failure is sent back once, and the next stop is allowed. Those hooks also block an edit to .env.

GitHub Actions runs one job, named check, on every push to any branch. It installs gitleaks and scans the repo first. Then it installs Node and uv and runs npm run check, using the Google Chrome already on the runner. A failed check uploads the Playwright report. The workflow has no secrets.

docs/IMPROVE.md is the Deploy step that runs after the review fixes and before the merge. AGENTS.md points to it.

Dark mode is on the top bar of every page. Light mode is the default. The browser remembers the choice. The page background is #04232E in dark mode and panels are black. Ink is Sea Mist. Stage colors stay the same. The app does not follow the device setting.

Run npm run seed to replace every row with the sample set. Seed does not ask first. A missing database is created and filled on the first start. A later start leaves the existing file as it is.

A review on 2026-11-14 found one bug and no nits. On a contact timeline, delete named the contact for a deal activity and for a stage entry. The dialog now names the deal. A stage entry says that deal stays in its current stage. On the deal page the dialog still names that deal and its stage.

On 2026-11-14 the docs were reorganized. docs/spec.md describes the product as it stands. The MVP intent and plan moved to docs/changes/mvp/. No application code changed.

docs/STANDARDS.md holds the coding guidelines. AGENTS.md points to it. A review checks each change against it.
