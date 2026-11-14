# Intent: sign-in, search and a user menu

## Problem

Accountable runs on one computer for one person. A team can't share it, nobody signs in, and there's no quick way to find a record.

## Proposed outcome

A small team shares one Accountable on the web. Everyone signs in and works on the same organizations, contacts and deals, and each record shows who added it. A search box in the top bar finds an organization, a contact or a deal by part of its name. The search box on each table stays, and it still matches the fields it matches today. A menu under your initials holds the theme, light, dark or system, and signing out. This browser remembers the theme choice.

## Constraints

- The shared app's data lives in Postgres on Supabase, still through SQLAlchemy Core. The tests keep their own SQLite databases. `npm run dev` uses the local sample data and made-up teammates, and it does not contact Supabase.
- Sign-in uses Supabase Auth with an email and password. The browser holds only the publishable key. The backend checks the token on every request and takes the user from it, never from the request.
- There's no sign-up page. People are added in Supabase's dashboard.
- The settings live in .env as DATABASE_URL, SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY.
- Each organization, contact, deal and activity records who added it and who last changed it.
- The end-to-end tests and ui-check sign in without anyone's real password and never touch Supabase. CI needs no secrets.
- Search from the top bar ignores case, matches part of a name, and works the same on SQLite and Postgres. It finds organizations, contacts and deals. Each table keeps its own search.
- The theme moves from the dark mode button into the menu. The choice is light, dark or system, and this browser remembers it. System follows that device's setting. The choice does not follow the person to another computer.
- The shared app needs an internet connection, for Supabase. `npm run dev` and the tests still run without one.
- The built frontend deploys to a temporary S3 bucket with public access blocked. The API runs on a separate host. That host is named before Deploy. The Supabase settings are environment variables on the API host. They are not written into the bucket or the repo. This change does not deploy to Render.
- Every unit test, old and new, runs in under a second on this computer, because CI runs on a much slower machine.
- No new dependencies unless the plan makes the case for one.

## Not in this change

- Roles and permissions: everyone can do everything.
- Moving the data in the local SQLite file to Supabase. Supabase starts with the sample data.
- Signing in with Google, magic links or a password reset.

## Success criteria

1. npm run check passes and never touches Supabase, with or without the settings in .env.
2. Signed out, every page shows the sign-in screen and every API route refuses. Signed in, everything works as before.
3. Every record and activity shows who added it.
4. The top-bar search finds an organization, a contact and a deal by part of a name, in any case. The search on each table still works as it does today.
5. The menu's theme choice is remembered in this browser, and System follows the device's setting.
6. On this computer, a production-shaped run signs in against Supabase. The built frontend is also deployed to a temporary S3 bucket with public access blocked. The API host is named before Deploy.
