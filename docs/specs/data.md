## Data

`npm run dev` and the tests use SQLite. `npm run dev` uses `data/accountable.db`. Each test run uses its own SQLite file and does not change the dev data. The shared backend uses Postgres on Supabase, through `DATABASE_URL`. SQLAlchemy Core talks to whichever database is in use. The handlers do not send raw SQL strings.

Migrations run when the backend starts. Rows already in the database stay. A missing database is created and filled with the sample data. The local SQLite file is not copied to Supabase. A new Supabase database starts from the sample data.

Row level security is on for every table. No policy lets the publishable key read or write those tables. The backend's database role is the one that reads and writes.

`npm run seed` deletes that file's records and loads the sample data again. It does not ask.

Card order is the `position` value inside the stage. After a drop, the app writes positions `0, 1, 2...` from the top of each column that changed. The top card is position 0.

### Sample data

The first start looks alive on every screen.

| Records | What the set contains |
|---|---|
| 8 organizations | A different industry on each |
| 18 contacts | 6 Lead, 6 Qualified, and 6 Customer |
| 20 deals | At least 2 deals in every stage. At least 2 late deals. Won deals spread across the last 6 months, including a month with no win. Lost deals. Deals with a close date in a later month |
| 12 activities | Notes, calls, and emails. At least 2 overdue follow-ups. At least 2 follow-ups due within 7 days. Some activities with no follow-up |

Names are fictional. The set is the same on every fresh database, so the screens and the tests can rely on it. On a fresh database, Alex Rivera is who added every sample record and activity, and who last changed them.

## How it runs

`npm run dev` starts the backend and the frontend on this computer, with the sample data and the made-up teammates. It does not contact Supabase. It works on Mac, Linux, and Windows.

The dev backend listens on `127.0.0.1` port 8000. The dev frontend listens on `127.0.0.1` port 5173 and proxies `/api` to the backend. Neither process listens on the network.

`npm start` runs the backend on this computer against Supabase. Migrations run when it starts. The built frontend is uploaded to a temporary S3 bucket with public access blocked. CloudFront is the only reader, because the bucket blocks public access. From this computer, the browser opens that site and calls `http://127.0.0.1:8000`. The backend allows the origin in `FRONTEND_ORIGIN`. The Supabase URL and the publishable key are given to that frontend build. They are not committed. The database URL and `FRONTEND_ORIGIN` stay in the environment on this computer.

`npm run dev` and the tests need no internet connection. The shared backend needs internet for Supabase. Fonts are files in the frontend, not a request to Google. This change does not deploy to Render.

`docs/STATUS.md` says how to run the app. `README.md` stays the course guide.

## Libraries

Use a mature library for each of these. Do not hand-roll them.

| Job | Library |
|---|---|
| Tables | TanStack Table |
| Line chart, bar chart, and funnel | Recharts |
| Drag and drop on the board | dnd-kit |

The stack is the one in `docs/TECH_STACK.md`. The frontend is React, Vite, and TypeScript in `frontend/`. The backend is FastAPI on Python 3.12, run with uv. `pyproject.toml` and `uv.lock` sit at the repo root.

## Tests to lock

`npm test` runs Vitest, pytest, and Playwright. Playwright uses the installed Google Chrome. Playwright starts the app itself. Any failed test fails `npm test`.

| Layer | What it must prove |
|---|---|
| Backend | Stage change sets the usual probability. A hand-set probability survives until the stage changes. Expected revenue, late deals, dashboard totals, delete effects, and card position after a drop |
| Frontend | Money format, the Late mark, and the split between overdue and upcoming follow-ups |
| Browser | Signed out, every page is the sign-in screen. Signed in as a made-up teammate, the dashboard opens with sample data. The owner can add, search, and sort. The top bar finds a record by part of a name. The contact filter works. A drag to another column stays after refresh. A new follow-up shows on the dashboard. Delete asks first. A record shows who added it. The menu stores Light, Dark, or System in this browser, and System follows the device |

Each unit test, old and new, finishes in under a second on this computer. `npm run check` does not contact Supabase.

Passing tests is required. It is not the whole bar. The owner uses every section in a real browser, with no console errors, and judges the look against the brand.
