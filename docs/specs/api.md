## API

The frontend reads and writes only through this JSON API. The browser calls `/api` on the same origin.

| Action | Method and path |
|---|---|
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

A move that changes stage also sets the usual probability, clears the hand-set flag, reindexes both columns, and writes the stage entry. A move inside one column only reindexes that column.

A missing record returns 404. A bad field returns 422 and names the field. Delete of a record that exists returns 204.
