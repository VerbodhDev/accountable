The product is described in docs/spec.md. The chosen mockup is docs/mockups/figures.html. The MVP intent and plan are in docs/changes/mvp/. The plan traces spec IDs S01 to S86.

CRM code sits in the accountable.crm package. The database module sits beside it, so a later business area has a place to go.

Run npm run dev from the repo root. The site opens at http://127.0.0.1:5173. The API listens at http://127.0.0.1:8000. Sign in as Alex Rivera with alex.rivera@example.com and the password local-only. Jordan Blake and Sam Patel use the same password. This local run uses those made-up teammates and does not contact Supabase.

npm start loads .env, turns on the shared database, and runs only the backend on 127.0.0.1 port 8000. When FRONTEND_ORIGIN is unset, it reads data/frontend-origin so the backend allows the deployed site. It does not upload the site.

npm run deploy:frontend builds the frontend and uploads frontend/dist to a private S3 bucket in ap-southeast-1. The AWS profile is personal-sso. Public access stays blocked on all four settings. Encryption is SSE-S3. CloudFront is the only reader. The site is https://d3lzszqmcqjrkz.cloudfront.net. The script writes that origin to data/frontend-origin. Open the site in a browser on this computer while npm start is running. The CloudFront distribution has a small ongoing cost until it is deleted.

Run npm run check before calling work finished. It runs Prettier, ESLint, ruff format, ruff check, tsc, ty, and gitleaks, then pytest, Vitest, and Playwright. Unit coverage must be at least 80 percent. The command fails if any check fails. npm run check:quick skips Playwright. npm run format fixes formatting. npm test still runs the three test suites. Playwright uses the installed Google Chrome and its own database file. Coverage is enforced by npm run check.

ESLint warns on TanStack Table's useReactTable. The table stays, because the product uses that library. The warning does not fail the check.

A lefthook pre-commit hook formats the staged files, then runs ESLint, ruff check, tsc, ty, and gitleaks. It skips the tests. npm install sets the hook up. Grok hooks in .grok/hooks run npm run check:quick when a turn ends. A failure is sent back once, and the next stop is allowed. Those hooks also block an edit to .env.

Two project subagents live in .grok/agents/. reviewer reads a branch against docs/REVIEW.md and reports Important findings and at most five nits. Its shell can only run commands that read. ui-check opens the running app with the Playwright MCP server, checks each page against the brand skill and docs/spec.md, and saves screenshots in .playwright-mcp/. It does not change code. Both run on grok-4.6. A new session loads them. On 14 Nov 2026 reviewer checked commit f94f789 and ui-check checked the dashboard and the pipeline.

GitHub Actions runs one job, named check, on every push to any branch. It installs gitleaks and scans the repo first. Then it installs Node and uv and runs npm run check:quick. The end-to-end tests stay in npm run check on the computer. The workflow has no secrets.

docs/IMPROVE.md is the Deploy step that runs after the review fixes and before the merge. AGENTS.md points to it.

A window narrower than 900px uses the phone layout. The top bar wraps, figures and paired panels stack, and a table or the pipeline scrolls inside its panel. The page itself does not scroll sideways. A review on 2026-11-14 found no important findings and no nits. At 390px and at 768px the dashboard, the organization list, the pipeline, and an organization page do not scroll the page sideways. At 1280px the laptop layout stays. The browser console had no errors.

The top bar shows a search box and the signed-in person's initials. The menu under the initials holds Light, Dark, System, and Sign out. Light is the default. This browser remembers the choice. System follows this device. The page background is #04232E in dark mode and panels are black. Ink is Sea Mist. Stage colors stay the same.

Run npm run seed to replace every row with the sample set. Seed does not ask first. A missing database is created and filled on the first start. A later start leaves the existing file as it is.

A review on 2026-11-14 found one bug and no nits. On a contact timeline, delete named the contact for a deal activity and for a stage entry. The dialog now names the deal. A stage entry says that deal stays in its current stage. On the deal page the dialog still names that deal and its stage.

On 2026-11-14 the docs were reorganized. docs/spec.md describes the product as it stands. The MVP intent and plan moved to docs/changes/mvp/. No application code changed.

docs/STANDARDS.md holds the coding guidelines. AGENTS.md points to it. A review checks each change against it.

## Ideas

- The built site is on a private S3 bucket in Singapore. CloudFront is the only reader. Run npm run deploy:frontend to upload a new build.
