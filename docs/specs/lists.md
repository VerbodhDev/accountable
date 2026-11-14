## What the owner can do

### Tables

Organizations, contacts, and deals each have a table. Each table has:

- A search box. Search runs as the owner types. It is not case sensitive. It matches part of a word.
- Column headings the owner can sort. A second click reverses the sort.
- A way to add a record.
- Edit and delete on each row.

This is the search box on the table. The search box in the top bar is separate, and it is described in docs/specs/shell.md. Table search matches these fields:

| Table | Fields |
|---|---|
| Organizations | Name, industry, website |
| Contacts | Name, email, phone, job title, organization name |
| Deals | Name, organization name, main contact name |

The default sort is name A to Z for organizations and contacts. For deals it is close date, soonest first. Deals with no close date sort last.

The contacts table has a status filter: All, Lead, Qualified, or Customer. The filter works together with search and sort.

### Delete

Delete asks first. The dialog says what will happen to linked records. The owner confirms or cancels.

| The owner deletes | What the app deletes with it | What stays |
|---|---|---|
| An organization | Its contacts, its deals, and activities on those contacts and deals, and those deals' stage entries | Nothing linked to it |
| A contact | Activities logged on that contact | Deals stay. A deal that had this main contact now has none |
| A deal | Its activities and its stage entries | The organization and the contact |
| An activity | That activity only | The contact or deal |
| A stage entry | That entry only | The deal's current stage |

### Record pages

| Page | What it shows |
|---|---|
| Organization | Its fields, who added it, its contacts, and its deals |
| Contact | Its fields, who added it, its organization, the deals where it is the main contact, and its timeline |
| Deal | Its fields, who added it, its organization, its main contact, a late mark when it is late, and its timeline |

From an organization page the owner can add a contact or a deal already tied to that organization.
