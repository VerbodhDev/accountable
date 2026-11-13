# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

`AGENTS.md` is the shared instruction file for every coding agent in this course. Claude Code stops reading it by itself once a `CLAUDE.md` exists, so the import above must stay. Put rules that every agent needs in `AGENTS.md`, not here.

## State of the repo

On `main` the app does not exist yet: there is no `package.json`, `frontend/` or `backend/`. The repo holds the course material (`course/`) and the documents the build starts from (`docs/`). `docs/STATUS.md` says what is built and how to run it; read it before you assume a command works.

## Commands

`docs/TECH_STACK.md` defines these. They exist only after the Week 1 Day 3 build.

- `npm run dev` starts the backend and the frontend together.
- `npm test` runs every test: Vitest, pytest and Playwright. The Playwright tests start the app themselves and use their own database.
- `npm run seed` resets the database to the sample data. From Week 2 Day 2 it asks first; answer `yes`.
- `npm run check` and `npm run check:quick` come with the Week 1 Day 4 harness.
- `uv run course/check_supabase.py` checks the Supabase settings in `.env` (Week 1 Day 5). It changes nothing.

No single-test command is defined yet. When the build adds one, write it in `docs/STATUS.md`.

## Architecture (planned)

- `frontend/`: React, Vite and TypeScript, an npm workspace of the root `package.json`.
- `backend/`: FastAPI on Python 3.12 with uv. `pyproject.toml` and `uv.lock` sit at the repo root, not in `backend/`.
- The frontend reads and writes only through the backend's JSON API.
- Data is a local SQLite file, through SQLAlchemy Core with no raw SQL. The backend fills a new database with the sample data.
- `e2e/`: Playwright Test with the installed Google Chrome.
- Later days move sign-in and the database to Supabase and deploy to Render. `npm run dev` and the tests keep using SQLite.

Use a mature library for tables, charts and drag-and-drop; do not hand-roll them.

## Rules specific to this repo

- `README.md` is the course's own guide. Do not edit it. How to run the app goes in `docs/STATUS.md`.
- Each piece of work starts from an intent in `docs/` (`docs/intent.md` for the MVP). Its "Not in the MVP" list is a hard limit on scope.
- A feature is done only after someone used it end to end in a real browser with no console errors. Passing tests are not enough (success criterion 8 in `docs/intent.md`).
- The brand guidelines take priority over general design guidance. On Week 1 Day 2 they move from `docs/BRAND.md` to the skill `.claude/skills/brand/SKILL.md`.
- Many model and product names in the course are newer than your training data. Check `course/coding_agents/` or the product's docs before you correct one.

## Branches

- `main` is the student's own build. Each change gets its own branch, merged into `main`.
- `origin/weekNdayN-end` holds Ed's build at the end of each day. Commit local work before you switch to one.
- To share work or pull Ed's updates, follow `course/for_agents/AGENT_GIT_GUIDE.md`.
- On the cheap-model route (`course/cheap_llm_instructions/`), do not suggest Ed's branches; his build is much bigger than the student's.
