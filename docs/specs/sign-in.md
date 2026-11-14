# Sign-in

A person signs in with an email and a password. Sign-in uses Supabase Auth. There is no sign-up page, no Google sign-in, no magic link, and no password reset. A person is added in the Supabase dashboard.

The browser holds the Supabase URL and the publishable key, and nothing else from the settings. The database URL stays in .env on this computer. It is not in the repo and it is not in the S3 bucket.

`GET /api/config` answers while signed out. It returns the Supabase URL and the publishable key. It does not return the database URL. `POST /api/session` also answers while signed out, and only when the backend is local. Every other API route checks the bearer token and refuses when the token is missing or invalid. The backend takes the user from the token. It never takes the user from the request body or the query.

Signed out, every page shows the sign-in screen. The screen is one panel: email, password, and Sign in. A field error sits by that field. The panel stays open. The panel uses the page, panel, and ink tokens. Sign in is a Sea Green button with Midnight text. There is no link to create an account.

This browser stores the sign-in token. A reload stays signed in. Sign out removes the token and returns to the sign-in screen.

Signed in, the top bar shows the person's initials. The initials are the first letter of each word of the name, up to two letters. The menu under the initials holds Light, Dark, System, and Sign out.

The rest of the spec calls the signed-in person the owner. Every signed-in person can do what the owner can do.

`npm run dev` does not contact Supabase. It offers these made-up teammates, and the password for each of them is `local-only`:

| Name | Email | Initials |
|---|---|---|
| Alex Rivera | alex.rivera@example.com | AR |
| Jordan Blake | jordan.blake@example.com | JB |
| Sam Patel | sam.patel@example.com | SP |

On this computer, the sign-in screen sends the email and the password to `POST /api/session`. The shared backend does not offer that route. There, the browser signs in with Supabase Auth, using the URL and the publishable key from `GET /api/config`.

The end-to-end tests and ui-check sign in as one of these teammates. They do not use a real password and they do not contact Supabase. CI has no secrets. `npm run check` does not contact Supabase, whether or not .env has the settings.
