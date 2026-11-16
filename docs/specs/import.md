# Spec: Import from HubSpot

Part of the [spec](../spec.md), which has the summary, the terms, the quality rules and the index of every area file.

## Import

- **I1.** Import reads a HubSpot export and adds what it holds to Accountable. It handles three files: companies, contacts and deals. It opens from the menu under the person's initials ([N7](shell.md#app-shell)), at the address /import. Every example value in this spec and in its tests is made up.
- **I2.** The cleanest order is companies, then contacts, then deals. It is not a rule. A contact file adds a company it names that is missing (I11), and a deal file adds a company or a contact it names that is missing (I16a). Each preview counts what it will add.
- **I3.** Nothing is saved until the person confirms. Choosing a file shows a preview. Confirming saves every good row in one step, and if that step fails, none of the rows is kept. The same file imported twice adds nothing the second time (I7).
- **I4.** Each record the import adds follows the rules of one added by hand ([F1 to F12](records.md#adding-and-editing)): the same required fields, the same limits and the same messages. It shows who added it ([U10](sign-in.md#people-and-names)), as the person who confirmed. Adding a deal as Won makes its main contact a customer ([S8](deals.md#stage-changes)).
- **I5.** Amounts are read as US dollars, whatever currency HubSpot holds. Accountable has one currency.

## The files

HubSpot's export dialog has a Customize section. These columns were seen in real exports of a free account, in English, as UTF-8 with no byte-order mark. A file with a byte-order mark is read too. The columns in a file follow the HubSpot list's properties, so a file can hold more columns, in any order. The import uses the ones below and ignores the rest. The preview names the ignored ones.

| File | Needs these columns | Also uses |
|---|---|---|
| Companies | Company name | Industry |
| Contacts | First Name, Last Name, Company Name | Email, Phone Number, Lifecycle Stage |
| Deals | Deal Name, Deal Stage, Amount, Close Date, Associated Company (Primary), Associated Contact, Number of Associated Contacts | |

- **I6.** A file that lacks a needed column is refused as a whole, with a message that names the missing columns, such as "This is not a HubSpot companies file. It has no Company name column." Nothing is previewed. For a deal file the message adds how to export it: in HubSpot's Export window, open Customize, and under Properties included in export choose All properties and all associations on records. HubSpot's default deal export holds no association columns. A contacts file also has a Company Name column, so a file with First Name and Last Name columns, sent as companies, is refused with "This looks like a contacts file, not a companies file. Choose Contacts above."

## Matching what is already there

- **I7.** A row whose record already exists is not added and is counted as already there. Spaces at either end are dropped, and case is ignored, before any comparison.

| Record | Already there when |
|---|---|
| Organization | an organization has the same name |
| Contact | a contact has the same email. With no email, a contact at the same organization has the same name. |
| Deal | a deal at the same organization has the same name |

- **I8.** A row that repeats an earlier row of the same file by these rules is counted as already there too. Accountable lets two records share a name ([F9](records.md#adding-and-editing)). The import does not, because a second import of the same file would otherwise double everything.

## Companies

- **I9.** A HubSpot company becomes an organization. Company name becomes the Name, and Industry becomes the Industry. A row with no Company name is rejected with "Enter a name". Phone Number, City and Country/Region have no field in Accountable, so they go into the Notes, one line each, in that order, such as "Phone: +65 0000 0000", "City: Singapore" and "Country/Region: Singapore". A blank one adds no line. The other columns are not imported. A company that already exists is left as it is, Notes included, because a row that matches is skipped (I7).

## Contacts

- **I10.** A HubSpot contact becomes a contact. First Name and Last Name, joined with a space and trimmed, become the Name. A row with neither is rejected with "Enter a name". Email and Phone Number carry over. An email that does not look like one is rejected with the message of [F6](records.md#adding-and-editing).
- **I11.** Company Name picks the contact's organization by the rule in I7. A company that is not in Accountable is added with the contact, and the preview counts it as a company to add. A row with no Company Name is rejected with "Choose an organization".
- **I12.** Lifecycle Stage becomes the status. HubSpot's default stages, in its documentation, are Subscriber, Lead, Marketing Qualified Lead, Sales Qualified Lead, Opportunity, Customer, Evangelist and Other.

| Lifecycle Stage | Status |
|---|---|
| Customer | Customer |
| Opportunity, Marketing Qualified Lead, Sales Qualified Lead | Qualified |
| Subscriber, Lead, Evangelist, Other, blank, or any stage not listed | Lead |

## Deals

- **I13.** A HubSpot deal becomes a deal. Each of these checks rejects the row with its own reason, in this order, and the preview shows the first one that fails.

| Check | Reason shown |
|---|---|
| Deal Name is blank | Enter a name |
| Deal Stage is not one of HubSpot's seven default stages | Stage "X" is not one of the seven HubSpot deal stages |
| Amount is blank or not a number | No amount, or Amount is not a number |
| Close Date is blank or not a date | No close date, or Close Date is not a date |
| A Won or Lost deal's close date is in the future ([F7](records.md#adding-and-editing)) | A won or lost deal can't close in the future |
| Associated Company (Primary) is blank | No company |
| Number of Associated Contacts is not a number | Number of Associated Contacts is not a number |
| Number of Associated Contacts is 0 or blank | No contact |
| Number of Associated Contacts is more than 1 | More than one contact. Accountable keeps one main contact. |
| Associated Contact is longer than 500 characters | The contact cell is too long |
| Associated Contact holds no email | The contact has no email, so it cannot be matched |
| Associated Contact holds an email but no name | The contact has no name |

- **I14.** Deal Stage becomes the stage. HubSpot's default sales pipeline has seven stages, from its documentation. Labels are compared ignoring case. The pipeline's own name is not checked, because the export of a real account named it "Deals pipeline".

| HubSpot Deal Stage | Stage |
|---|---|
| Appointment Scheduled | New |
| Qualified To Buy | Qualified |
| Presentation Scheduled | Proposal |
| Decision Maker Bought-In, Contract Sent | Negotiation |
| Closed Won | Won |
| Closed Lost | Lost |

- **I15.** Amount is rounded to the nearest whole dollar, and the preview shows the rounded figure beside the original. A negative amount, or one over the limit of a deal's value ([F6](records.md#adding-and-editing)), is rejected with the message of F6. Close Date is a date and a time, such as 2026-11-16 02:45. The import takes the date as written and ignores the time. The probability is the stage's usual one ([F8](records.md#adding-and-editing)).
- **I16.** The main contact is the contact whose email ends the Associated Contact cell. HubSpot writes that cell as a name and the email in brackets. A name can hold brackets too, so the import reads the last bracketed part, and the name is the text before it. A deal's contact does not have to work at the deal's company, because [F4](records.md#adding-and-editing) allows that.
- **I16a.** A company that the deal names and that is not in Accountable is added, with that name. A contact whose email is not in Accountable is added, with the name and email from the cell, at the deal's company, with the status Lead. A Won deal then makes it a customer ([S8](deals.md#stage-changes)). Two deals in one file that name the same new company or contact add it once. The preview counts them as companies to add and contacts to add. A deal row that is rejected adds nothing.

## Limits and safety

- **I17.** A file holds at most 2 MB, 2,000 rows not counting the header row, and 400 columns. A single cell can hold at most 131,072 characters, which is the CSV reader's own limit, and a file with a longer cell is refused as unreadable. Blank rows are ignored. A larger file is refused whole, with "This file is too large. Split it into files of 2,000 rows or fewer." The page checks the size before it reads the file. The backend checks both again, because a request can skip the page.
- **I18.** The page sends the file's text in a JSON body, because the API takes no file upload ([Security](security.md#requests)). Escaping can make the text larger, so a file near 2 MB may pass the page's check and still meet the backend's 2 MB body limit, which answers 413. The page then shows the message of I17.
- **I19.** The file is untrusted. The backend refuses text that holds a NUL character, a file that is not text, and a file whose header row it cannot read, each with a plain message and no 500. A cell is data and nothing else. One that starts with =, +, - or @ is stored as the text it is, and shown as text. Names and other fields follow the limits and checks of the forms.
- **I20.** The file is read in memory and never written to disk or kept. The preview and the save each read the text again. The save never trusts a count or a row list from the preview, so a request cannot ask for more than the file holds. A log line names the kind, the counts and the person, and never a row's content.
- **I21.** The routes need a valid token like every other route, and refuse with 401 without one ([Security](security.md#signing-in)). Any signed-in person can import, because everyone can add records ([sign-in.md](sign-in.md#signing-in)).
- **I22.** A save takes the write lock and runs in one transaction, as a delete does, so two imports at once cannot add the same record twice.

## The routes

| Method and path | Purpose |
|---|---|
| `POST /imports/companies` | Body: `csv` (the file's text) and `save` (true or false). |
| `POST /imports/contacts` | The same body. |
| `POST /imports/deals` | The same body. |

Every reply has `counts` (`new`, `existing`, `rejected`, `companies_to_add` and `contacts_to_add`, the last two zero where a kind adds none), `deals` (for a deals file, the first 10 new deals, each with its `row`, `name`, `stage`, `value`, `amount` as written and `rounded`; empty for the other kinds), `rejected` (up to 100 rows, each with its row number and reason, the header being row 1), `rejected_more` (how many more there are), `ignored_columns`, and `saved` (false for a preview, true after a save). A refused file returns 422 with `fields` holding the message under `csv`, like every other refused request. Row numbers count the header as row 1, so the first record is row 2, as in a spreadsheet.

## The screen

The Import page has the page title "Import from HubSpot", and one panel under it, in the panel color, rounded like the other panels. The look follows [Visual design](visual-design.md#visual-design), in light and dark mode.

- **I23.** The panel has three steps, top to bottom. Step 1 is "What is in the file?", with three radio choices: Companies, Contacts and Deals. Under Deals a muted line says how to export (I6). Step 2 is a Choose file button that opens the browser's file picker for .csv files, with the chosen file's name beside it, shortened with "…" if it is long. Step 3 is the preview.
- **I24.** The preview shows three figures in a row: New, Already there and Rejected. For contacts a fourth, Companies to add, and for deals a fourth and a fifth, Companies to add and Contacts to add, come before Already there. Under them a line names the ignored columns. If any row is rejected, a table lists Row and Reason, up to 100 rows, and a line says how many more there are. For a deals file, a table under them lists the first 10 new deals, each with its row, name, stage and amount. An amount that was rounded shows the whole dollars it becomes, with the amount as written beside it, such as "$451 (rounded from 450.5)". A line says how many more new deals there are.
- **I25.** The primary button reads "Import 12 new companies", with the number and the kind. It is off when nothing is new. Beside it, Choose another file clears the preview. While a file is being read the panel says "Reading the file". While it saves, the button is quiet and says "Importing".
- **I26.** After a save the panel says what was added, such as "Added 12 organizations. 3 were already there.", and links to the list it filled: Organizations, Contacts or Deals. The preview is gone, so the same click cannot save twice ([F10](records.md#adding-and-editing)).
- **I27.** A refused file shows its message in place of the preview, in the error style the forms use. A request that fails to arrive says so, keeps the file chosen, and offers to try again. A body the backend finds too big gets the message of I17, with no Try again. A file the browser cannot read says "This file could not be read.". While a save is on its way, the kind and the file button are off. The preview is announced as one line, such as "Preview ready: 2 new, 1 already there, 1 rejected", not figure by figure. The page works by keyboard, shows a focus ring, and uses no animation beyond the app's own.
- **I28.** Opening Import with no file chosen shows step 1 and step 2 only. Changing the kind clears the preview and previews the chosen file again as the new kind, so a preview never sits beside the wrong choice.
