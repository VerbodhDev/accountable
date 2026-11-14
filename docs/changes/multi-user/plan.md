# Plan: sign-in, search and a user menu

The spec in docs/spec.md and docs/specs/ is the behavior. This plan says which files change, in what order, and which tests prove it.

Each file is in one part. The parts run in order, so a later part can import a module an earlier part created. Two parts do not edit the same file.

## Files that change

### Sign-in and the database

- pyproject.toml and uv.lock. Add `psycopg[binary]`, because SQLAlchemy cannot open a Postgres `DATABASE_URL` without a driver. Move `httpx` from the dev group into the app dependencies. The backend asks Supabase Auth whether a token is valid, and httpx is already how this repo makes HTTP calls. Do not add a JWT library or a Supabase client.
- backend/accountable/db.py. `npm run dev`, the tests, and `npm run check` keep using SQLite, including when .env holds the Supabase settings. They do not read .env. `npm start` sets `ACCOUNTABLE_SHARED=1`, and only then does the backend use `DATABASE_URL`. Startup creates a missing database, runs the schema changes, and leaves existing rows in place. On Postgres it turns on row level security for every table and adds no policy for the publishable key. That statement lives in startup, not in a request handler. Request handlers still send no raw SQL.
- backend/accountable/crm/tables.py. Add a people table. An organization, contact, deal, and activity stores who added it and who last changed it, as the person's id. A stage entry does not.
- backend/accountable/crm/seed.py. The three made-up teammates are Alex Rivera, Jordan Blake, and Sam Patel, with the emails in docs/specs/sign-in.md. Alex Rivera added and last changed every sample record and activity.
- backend/accountable/crm/schemas.py. Responses include the name of who added a record. They do not include who last changed it. Requests do not send either person.
- backend/accountable/auth.py. New. `GET /api/config` returns the Supabase URL and the publishable key, and nothing else. Every other route requires a bearer token. The user comes from the token. On the shared backend, httpx calls Supabase Auth and the tests replace that call with a fake, so no test opens a network connection. On `npm run dev` and in the tests, the password `local-only` signs in a made-up teammate and the backend issues a token it can check itself.
- backend/accountable/main.py. Mount the auth dependency. Allow the origin in `FRONTEND_ORIGIN` only when `ACCOUNTABLE_SHARED=1`. Load `accountable.crm.search` if that module exists, so the search part can add it without editing this file.
- backend/accountable/crm/routes.py. Reject a missing or invalid token with 401. On create, store the signed-in person as who added it and who last changed it. On update, store that person as who last changed it.
- backend/tests/test_auth.py. New.
- backend/tests/test_records.py and backend/tests/test_seed.py. Cover the new person columns.
- frontend/src/lib/api.ts and frontend/src/lib/api.test.ts. Send the bearer token. A 401 clears it.
- frontend/src/shell/session.tsx. New. This browser stores the token. A reload stays signed in. Sign out removes it.
- frontend/src/shell/SignIn.tsx and frontend/src/shell/SignIn.test.tsx. New. The sign-in panel, and the made-up teammates when the backend is local.
- frontend/src/main.tsx and frontend/src/main.test.tsx. Signed out, every route shows the sign-in screen.
- frontend/src/crm/pages/OrganizationPage.tsx, ContactPage.tsx, DealPage.tsx, DashboardPage.tsx, frontend/src/crm/Timeline.tsx, and the tests beside those files. Show who added the record or activity.
- scripts/e2e-server.mjs. Wait until `GET /api/config` answers. `GET /api/dashboard` now refuses while signed out.
- scripts/start.mjs and the `start` script in package.json. `npm start` loads .env itself, sets `ACCOUNTABLE_SHARED=1`, and runs the backend on 127.0.0.1 port 8000. It does not upload to S3.
- e2e/sign-in.spec.ts. New.
- e2e/app.spec.ts. Sign in as Alex Rivera before the existing steps.

### Search

- backend/accountable/crm/search.py. New. `GET /api/search?q=` matches part of an organization, contact, or deal name. The match uses the same lower-case comparison on SQLite and Postgres. An empty query returns no rows. The route uses the auth dependency. The list routes keep their own search.
- backend/tests/test_search.py. New.
- frontend/src/shell/SearchBox.tsx and frontend/src/shell/SearchBox.test.tsx. New. Results show the name and the kind of record. Choosing one opens that record. No matches says there are no matches.

This part does not edit the shell. The user-menu part is the one that puts the box on the top bar.

### User menu

- frontend/src/shell/theme.ts and frontend/src/shell/theme.test.ts. The stored values are light, dark, and system. System follows the device. Any other stored value is light. The choice stays in this browser.
- frontend/src/shell/Shell.tsx and frontend/src/shell/Shell.test.tsx. Remove the theme button. The top bar shows the search box and the initials. The menu holds Light, Dark, System, and Sign out. The menu panel uses the panel and ink tokens, with no outline and no gradient.
- e2e/theme.spec.ts. The menu's label is what the test reads.
- e2e/search.spec.ts. New. The top bar finds one organization, one contact, and one deal by part of a name, in a different case.
- docs/STATUS.md. Say how to sign in locally, how `npm start` differs from `npm run dev`, and that the S3 upload is still to do.

## Order of work

1. Sign-in and the database. After this part, a signed-out page is the sign-in screen, the API refuses, a made-up teammate can use every existing page, and each record shows who added it. `npm run check` still uses SQLite and does not contact Supabase.
2. Search. After this part, the search route and the search box are tested on their own.
3. User menu. After this part, the top bar has the search box and the initials menu, and the old theme button is gone.

## Risks

- A browser on another computer cannot call a backend on 127.0.0.1. The S3 site is opened from this computer. The bucket stays private. Uploading the built files is not part of these three parts.
- `npm run dev` and the tests must ignore .env. One flag, `ACCOUNTABLE_SHARED=1`, is the only switch onto Postgres and Supabase. If a test sets that flag, it will try the real database.
- An existing local database needs the new columns. Startup adds them and keeps the rows. The old file is not copied to Supabase.
- The end-to-end ready check looks at `/api/dashboard` today. That route will return 401 until the ready check moves to `/api/config`.
- The theme end-to-end test looks for a button named Dark mode. It has to look for the menu labels instead, or it will pass for the old control.
- Each unit test has to stay under a second. No test opens a network connection, sleeps, or loads the sample set more than once per test.

## Proof

Unit tests:

- backend/tests/test_auth.py. A missing token and a bad token get 401. `GET /api/config` answers while signed out and does not return the database URL. The signed-in person is taken from the token, not from the body. The Supabase call is a fake.
- backend/tests/test_records.py and backend/tests/test_seed.py. A created record stores the signed-in person. A sample record was added by Alex Rivera. A stage entry has no person.
- backend/tests/test_search.py. Part of a name matches in any case. An industry or an email does not match the top-bar search. An empty query returns nothing.
- frontend/src/shell/SignIn.test.tsx. Signed out, the page is the sign-in screen. A wrong password stays on that screen. Alex Rivera reaches the dashboard.
- frontend/src/shell/SearchBox.test.tsx. A result opens the record. No matches says there are no matches.
- frontend/src/shell/theme.test.ts. Light, dark, and system are stored. System follows a mocked device setting. Another stored value is light.
- frontend/src/shell/Shell.test.tsx. The menu shows the initials and the four labels. There is no Dark mode button.
- The record page tests show who added the record. The timeline and dashboard tests show who added an activity.

End-to-end tests:

- e2e/sign-in.spec.ts. Signed out, the organizations page is the sign-in screen. Signing in as Alex Rivera with `local-only` opens the dashboard. A reload stays signed in. Sign out returns to the sign-in screen.
- e2e/app.spec.ts. The existing steps still pass after that sign-in.
- e2e/search.spec.ts. The top bar finds an organization, a contact, and a deal by part of a name in a different case.
- e2e/theme.spec.ts. Choosing Dark in the menu turns the page dark and the menu shows Dark. A reload keeps it. System follows the device setting used by the test.
