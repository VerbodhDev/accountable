# Intent: import from HubSpot

This intent is for the assignment's first option: import data from another CRM. The CRM is HubSpot, on a free account. Every example value in this change is made up.

## Problem

A business that moves to Accountable already has its companies, contacts and deals in a CRM. Typing them in again by hand is slow and error-prone, so most people would not switch. HubSpot lets anyone export these records as CSV files, but Accountable cannot read them.

## Proposed outcome

An Import page opens from the menu under the user's initials. The user picks one HubSpot CSV file for companies, contacts or deals. Accountable reads it, and shows a preview before it saves anything:

- how many rows are new, how many already exist, and how many it rejects;
- for each rejected row, the line number and the reason, in plain words.

The user confirms, and the new records appear in Organizations, Contacts and Deals. Each one shows who added it, like a record added by hand. The user imports companies first, then contacts, then deals.

How HubSpot's words map to Accountable's:

- **Companies:** a HubSpot company becomes an organization. Its industry carries over. Its phone, city and country go into the organization's Notes, because Accountable has no field for them.
- **Contacts:** a HubSpot contact becomes a contact. The company named on it is found, or added if it is not there. Its lifecycle stage becomes the nearest status: lead, qualified or customer.
- **Deals:** a HubSpot deal becomes a deal. Its stage becomes the nearest of Accountable's six stages: Appointment Scheduled is New, Qualified To Buy is Qualified, Presentation Scheduled is Proposal, Decision Maker Bought-In and Contract Sent are Negotiation, Closed Won is Won, and Closed Lost is Lost. A deal needs an organization and a main contact. HubSpot's default deal export holds neither, so the file must carry HubSpot's association columns, and a file without them is refused with a message that says how to export it. A company or contact that a deal names and Accountable lacks is added with the deal.

A record that already exists is skipped and counted, so importing the same file twice adds nothing the second time. Companies match by name. Contacts match by email, or by name within their company when there is no email.

## Constraints

- Every name, email and figure in the code, the tests, the docs and the commit messages is made up. The three real HubSpot export files in docs/ hold HubSpot's own sample records. They show the formats. Tests use made-up rows in the same shape.
- The file is untrusted input. The Import page and its API need a signed-in user, like every other route. The backend checks the size, the number of rows, the encoding and the columns, and refuses a file that fails. A cell that starts with =, +, - or @ is stored as plain text. A value that a form would refuse is refused here with the same message. The file itself is never stored.
- The import follows the same rules as adding a record by hand. That includes the rule that a deal added as Won makes its main contact a customer.
- Nothing is saved until the user confirms the preview. The confirm saves every good row in one step. If the save fails, none of the rows is kept.
- English column headers only, as HubSpot exports them by default.
- No new dependency. The CSV module in Python's standard library reads the files.
- No change to the existing records, their rules or the books.

## Not in this change

- Salesforce, Pipedrive or another CRM.
- Importing activities, notes, products, quotes or invoices.
- Connecting to HubSpot's API, or importing on a schedule.
- Updating a record that exists. A matching row is skipped, never merged.
- A history of imports, or an undo for one.
- Custom HubSpot pipelines and custom properties. A deal in a stage Accountable cannot map is rejected with the stage's name.

## Decided

- **Deal amount:** an amount that is not a whole number of dollars is rounded to the nearest dollar. The preview shows the rounded amount.
- **Close date:** a deal with no close date is rejected with that reason. Accountable never invents one.
- **Contact status:** Customer becomes Customer. Opportunity and the qualified-lead stages become Qualified. Every other stage becomes Lead.
- **Limits:** one file holds at most 2 MB and 2,000 rows. A larger file is refused with a message that says to split it.

## Open points the spec settles

- The exact association column names in HubSpot's deal export. The export dialog offers them under Customize, and they have not been tried.
- HubSpot's full list of lifecycle stages, and the status each one gets under the rule above. Only Lead and Opportunity have been seen.

## Success criteria

1. npm run check passes.
2. Importing a companies file shows a preview with the counts, then adds the new organizations, and Organizations lists them.
3. Importing a contacts file adds the contacts on their companies, and adds a company that was missing. Statuses follow the mapping.
4. Importing a deals file that has association columns adds the deals on the board in the mapped stages, each with its organization and main contact, and adds any company or contact it names that was missing.
5. Importing the same file a second time adds nothing, and the preview says every row exists.
6. A file that is the wrong type, over 2 MB, over 2,000 rows, holds a NUL character or lacks the expected columns is refused with a plain message, and nothing is saved. A cell that starts with = is stored as text.
7. A signed-out request to the import API gets 401.
8. The real sample files in docs/ preview without error: the companies and contacts files as they are, and the deals file when it holds the association columns. The default deals file, which has none, is refused with a message that says how to export it.
