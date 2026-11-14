## Data

The database is one SQLite file, `data/accountable.db`. SQLAlchemy Core talks to it. The backend does not send raw SQL strings from the handlers.

On startup, a missing database is created and filled with the sample data. A database that already exists is left as it is.

`npm run seed` deletes that file's records and loads the sample data again. Tests use a different database file. Tests do not change the owner's data.

Card order is the `position` value inside the stage. After a drop, the app writes positions `0, 1, 2...` from the top of each column that changed. The top card is position 0.

### Sample data

The first start looks alive on every screen.

| Records | What the set contains |
|---|---|
| 8 organizations | A different industry on each |
| 18 contacts | 6 Lead, 6 Qualified, and 6 Customer |
| 20 deals | At least 2 deals in every stage. At least 2 late deals. Won deals spread across the last 6 months, including a month with no win. Lost deals. Deals with a close date in a later month |
| 12 activities | Notes, calls, and emails. At least 2 overdue follow-ups. At least 2 follow-ups due within 7 days. Some activities with no follow-up |

Names are fictional. The set is the same on every fresh database, so the screens and the tests can rely on it.

## How it runs

`npm run dev` starts the backend and the frontend. The command is the one documented way to start. It works on Mac, Linux, and Windows.

The backend listens on `127.0.0.1` port 8000. The frontend listens on `127.0.0.1` port 5173. The frontend proxies `/api` to the backend. Neither process listens on the network.

The app needs no internet connection to use. Fonts are files in the frontend, not a request to Google.

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
| Browser | The dashboard opens with sample data. The owner can add, search, and sort. The contact filter works. A drag to another column stays after refresh. A new follow-up shows on the dashboard. Delete asks first. Dark mode turns on from the top bar, the control then says Light mode, and the choice stays on after a reload |

Passing tests is required. It is not the whole bar. The owner uses every section in a real browser, with no console errors, and judges the look against the brand.
