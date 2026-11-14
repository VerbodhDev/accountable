## API

The frontend reads and writes only through this JSON API. It does not talk to the database. While `npm run dev` is running, the browser calls `/api` on the same origin. The site on the S3 bucket calls the backend at `http://127.0.0.1:8000`. The backend allows that site's origin.

`GET /api/config` answers while signed out and returns only the Supabase URL and the publishable key. Every other route requires a bearer token for the signed-in person. A missing or invalid token returns 401. The backend takes the user from the token.

| Action | Method and path |
|---|---|
| Public sign-in settings | `GET /api/config` |
| Top-bar search | `GET /api/search?q=` |
| Dashboard payload | `GET /api/dashboard` |
| List organizations | `GET /api/organizations?q=&sort=&dir=` |
| Create organization | `POST /api/organizations` |
| Read one | `GET /api/organizations/:id` |
| Update | `PATCH /api/organizations/:id` |
| Delete | `DELETE /api/organizations/:id` |
| List contacts | `GET /api/contacts?q=&sort=&dir=&status=` |
| Create, read, update, delete contact | Same pattern under `/api/contacts` |
| List deals | `GET /api/deals?q=&sort=&dir=` |
| Create, read, update, delete deal | Same pattern under `/api/deals` |
| Move a card | `PATCH /api/deals/:id` with stage and position |
| Create activity | `POST /api/activities` |
| Update activity | `PATCH /api/activities/:id` |
| Delete activity | `DELETE /api/activities/:id` |
| Delete a stage entry | `DELETE /api/stage-entries/:id` |

`status` on the contact list is `lead`, `qualified`, `customer`, or empty for all.

`GET /api/search` matches part of an organization name, a contact name, or a deal name. The match ignores case. An empty `q` returns no rows. The list routes keep their own `q` search, described in docs/specs/lists.md.

Creating a record stores the signed-in person as who added it and who last changed it. Updating a record stores that person as who last changed it. The request does not send either person.

A move that changes stage also sets the usual probability, clears the hand-set flag, reindexes both columns, and writes the stage entry. A move inside one column only reindexes that column.

A missing record returns 404. A bad field returns 422 and names the field. Delete of a record that exists returns 204.
