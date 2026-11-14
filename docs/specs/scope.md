## Not in this version

Sign-in, user accounts, several users, and a password. A record of who did what. Use from another device. Following the device's dark mode setting. A phone layout. AI features. Email, calendar, or phone integrations. A currency other than US dollars. Reports beyond the dashboard. Tags or custom fields. Editing the stage list. Import or export.

## Requirement IDs

Each ID is one requirement of the product. The sections above state the same requirements in full.

| ID | Requirement |
|---|---|
| S01 | One owner, who sells to other companies, uses the app on this computer |
| S02 | There is no password. Anyone at the keyboard can see and change every record |
| S03 | The app binds to 127.0.0.1 only. Another device cannot open it |
| S04 | The records are the sample set plus practice records. Real customer data is not required |
| S05 | A change is still there after a refresh and after a restart |
| S06 | An organization has a required name, and optional website, industry, and notes |
| S07 | A website is shown as a link when it is present |
| S08 | An organization has many contacts and many deals |
| S09 | A contact has name, email, phone, job title, an optional organization, and a status. A new contact is Lead |
| S10 | A lead is a contact with status Lead. There is no separate lead list |
| S11 | A deal has name, organization, optional main contact, stage, USD value of zero or more, probability 0 to 100, optional close date, and a position the owner does not type. The main contact must belong to the organization |
| S12 | A new deal starts at New, unless the owner adds it from a pipeline column |
| S13 | Usual probability is New 10%, Qualified 30%, Proposal 50%, Negotiation 70%, Won 100%, Lost 0% |
| S14 | A stage change sets the usual probability and clears a hand-set value. A hand-set probability stays until the stage changes |
| S15 | Expected revenue is value times probability, divided by 100 |
| S16 | Open means not Won and not Lost. Late means open with a close date before today. Won and Lost are not late |
| S17 | Moving a deal to another organization clears a main contact who is not at that organization |
| S18 | An activity has one parent, a contact or a deal. It has type, description, when it happened (default now), an optional follow-up date, and done (default not done) |
| S19 | Mark done keeps the activity on the timeline and removes it from the dashboard tasks |
| S20 | A stage change writes "Moved from {old} to {new}". It shows on the deal timeline and in recent activity. The owner can delete it and cannot edit its text |
| S21 | A move to Won or Lost with an empty close date sets the date to today |
| S22 | A Won deal with no close date is in none of the month totals |
| S23 | Search runs as the owner types. It is not case sensitive. It matches part of a word |
| S24 | Organization search uses name, industry, and website. Contact search uses name, email, phone, job title, and organization name. Deal search uses name, organization name, and main contact name |
| S25 | A heading click sorts. A second click reverses the sort |
| S26 | Organizations and contacts default to name A to Z. Deals default to close date, soonest first. Deals with no close date sort last |
| S27 | The contact status filter is All, Lead, Qualified, or Customer. It works together with search and sort |
| S28 | Each table can add, edit, and delete. Add and edit open as dialogs. Delete opens a confirm dialog |
| S29 | Delete asks first, names the linked records, and the owner can cancel |
| S30 | Delete an organization and its contacts, deals, activities, and stage entries go with it |
| S31 | Delete a contact and the activities on that contact go. Deals stay, with no main contact |
| S32 | Delete a deal and its activities and stage entries go. The organization and the contact stay |
| S33 | Delete an activity and only that activity goes |
| S34 | Delete a stage entry and only that entry goes. The deal's current stage stays |
| S35 | The organization page shows its fields, contacts, and deals. The owner can add a contact or a deal there, already tied to that organization |
| S36 | The contact page shows its fields, organization, deals where it is the main contact, and its timeline |
| S37 | The deal page shows its fields, organization, main contact, a late mark when it is late, and its timeline |
| S38 | An empty table says there are no records yet and offers add. A search with no matches says there are no matches |
| S39 | A field error shows beside that field. The dialog stays open |
| S40 | The board has six columns, in order: New, Qualified, Proposal, Negotiation, Won, Lost |
| S41 | A card shows the deal name, organization, value, and close date. Late shows on the card and on the deals table |
| S42 | A drag to another column changes the stage. A drag within a column, higher or lower, changes the place. The place remains after refresh and restart |
| S43 | The header shows open value and expected revenue. Each column shows its own. Won and Lost are outside the header. The figures change as soon as the drop is saved |
| S44 | If the save fails, the card returns and the app says it could not save the move |
| S45 | Add deal in a column uses that stage and its usual probability. The new card is at the top |
| S46 | After a stage change, the deals table shows the new stage and the new probability |
| S47 | A drop writes positions 0, 1, 2 from the top of each changed column. A move inside one column only reindexes that column |
| S48 | From a contact or a deal, the owner logs a note, a call, or an email, and can set a follow-up date. The owner can edit or delete it |
| S49 | A timeline is newest first and mixes activities and stage entries |
| S50 | A contact timeline also shows activities and stage entries for deals where that person is the main contact |
| S51 | The dashboard is the landing page. Its figures match the records. They change when a deal is marked won and when a follow-up is added |
| S52 | The five figures are open pipeline, expected revenue, revenue won this month, deals won this month, and the overdue follow-up count |
| S53 | The line chart is revenue won for the last 6 months, including this month. A month with no wins is $0. The point shows how many deals were won |
| S54 | The bar chart is expected revenue for New, Qualified, Proposal, and Negotiation |
| S55 | The funnel is the value sitting in each of those four stages now. It is not a history. Width follows the value |
| S56 | The three visuals do not repeat one series. Won and Lost are not in the bar or the funnel. Fills are flat. Colors are the stage colors |
| S57 | Recent activity is the 10 newest activities and stage entries. Each row names the contact or the deal |
| S58 | Overdue follow-ups are every undone one before today, oldest first. Upcoming ones are today through 7 days, soonest first. A later one stays on the record only |
| S59 | Each task shows the description, the contact or deal, the date, and Mark done. Overdue tasks show an Overdue mark |
| S60 | The dashboard layout is the figures mockup. The other two mockups are not the design |
| S61 | Light mode is the default. A theme control on the top bar is on every page. It says Dark mode in light mode and Light mode in dark mode. The browser remembers the choice. The app does not follow the device setting. A narrow window scrolls. It does not become a phone page |
| S62 | Light page background `#F0F4F5` with white panels. Dark page background `#04232E` with black panels. Panels are rounded and have no outline. Instrument Sans. JetBrains Mono for money, dates, and counts. No Instrument Serif |
| S63 | Light ink is Midnight. Dark ink is Sea Mist. A primary action is Sea Green with Midnight text in both modes. A destructive confirm is Raspberry with white text |
| S64 | Sea Green and Marigold are not used for small text. Text on Sea Green, Marigold, or Coral stays Midnight in both modes. No border on one edge. No line across the top. No gradient fills |
| S65 | The top bar is a rounded panel, white in light mode and black in dark mode. It shows Accountable, the five sections, and the theme control. The control says Dark mode in light mode and Light mode in dark mode. The current section is a Sea Green pill with Midnight text |
| S66 | Lead is Cerulean with white text. Qualified is Marigold with Midnight text. Customer is Sea Green with Midnight text. Late and Overdue are Raspberry with white text |
| S67 | Money always shows as US dollars, for example $1,250.00 |
| S68 | Labels are short. The tone is plain business English. There are no exclamation marks |
| S69 | The routes are `/`, `/organizations`, `/organizations/:id`, `/contacts`, `/contacts/:id`, `/deals`, `/deals/:id`, and `/pipeline` |
| S70 | The browser calls `/api` on the same origin and does not call another store |
| S71 | The API is the endpoint list in this spec, including `q`, `sort`, `dir`, and contact `status` of lead, qualified, customer, or empty |
| S72 | A move that changes stage sets the usual probability, clears the hand-set flag, reindexes both columns, and writes the stage entry |
| S73 | A missing record is 404. A bad field is 422 and names the field. A successful delete is 204 |
| S74 | The database is `data/accountable.db`. SQLAlchemy Core talks to it. Handlers send no raw SQL strings |
| S75 | A missing database is created and seeded. An existing database is left as it is |
| S76 | `npm run seed` replaces the rows with the sample set. It does not ask |
| S77 | Tests use their own database file. They do not change the owner's data |
| S78 | The sample set is 8 organizations in different industries, 18 contacts with 6 of each status, 20 deals with at least 2 in every stage, at least 2 late, won deals across the last 6 months including a month with no win, lost deals, future close dates, and 12 activities that include notes, calls, emails, at least 2 overdue follow-ups, at least 2 due within 7 days, and some with no follow-up. Names are fictional. The set is the same every fresh start |
| S79 | `npm run dev` starts both processes on Mac, Linux, and Windows. The API is `127.0.0.1` port 8000. The site is `127.0.0.1` port 5173 and proxies `/api`. Neither listens on the network |
| S80 | The app needs no internet to use. Font files ship in the frontend. It does not request Google |
| S81 | `docs/STATUS.md` says how to run the app. `README.md` stays unchanged |
| S82 | Tables use TanStack Table. Charts use Recharts. The board uses dnd-kit. Those jobs are not hand-rolled |
| S83 | The stack is `docs/TECH_STACK.md`. React, Vite, and TypeScript in `frontend/`. FastAPI on Python 3.12 with uv. `pyproject.toml` and `uv.lock` sit at the repo root |
| S84 | `npm test` runs Vitest, pytest, and Playwright with the installed Google Chrome. Playwright starts the app. Any failure fails the command |
| S85 | Sign-in, accounts, a password, several users, an audit trail, other devices, the device's own dark mode setting, a phone layout, AI, mail, calendar, phone integration, other currencies, extra reports, tags, custom fields, stage editing, import, and export are not built |
| S86 | The pipeline layout is the figures mockup: a totals panel, a stage chip on each column, and Add deal |
