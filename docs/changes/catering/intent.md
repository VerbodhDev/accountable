# Intent: Accountable for a catering company

This intent is for the assignment's second option: make the product highly specialized for one domain. The domain is catering. Every name in it is made up.

## Problem

The app and its sample data describe a generic software sales team. The stage names, the company details and the sample records say nothing about a business that sells event catering. A catering owner opening the app sees someone else's business.

## Proposed outcome

A catering company opens Accountable and sees its own business:

- The six deal stages read as a catering sale: Enquiry, Tasting, Quote sent, Deposit due, Confirmed and Lost.
- The company settings start as a made-up caterer, with a Singapore address, a GST tax label at 9 percent, and quote and invoice prefixes that fit.
- The sample data is catering: client companies, event deals, a menu as the price list, quotes, invoices and supplier bills for ingredients.
- The Copilot talks about enquiries, events and menus, and uses the new stage names.

## Constraints

- Every name, address, email and figure is made up. No real business, person or CRM record goes into the repo, the sample data, a test or a commit message. Addresses use the reserved .example domain.
- The six stage keys stay as they are in the database and the API: new, qualified, proposal, negotiation, won and lost. Only what the user reads changes, so there is no migration.
- No new dependency.
- The stage probabilities, the rules and the books stay as they are.
- Light and dark mode, and the design, stay as they are.

## Not in this change

- Renaming Deal, Organization and Contact to catering words.
- A currency setting. The app shows the dollar sign, which Singapore dollars share.
- Importing from HubSpot or another CRM. That is a separate change. The HubSpot export formats are known (contacts, companies and deals), and a deal export holds no link to its company unless association columns are added.
- Roles, or more than one business in one app.

## Success criteria

1. npm run check passes.
2. Every screen that shows a stage shows the catering name, and the board columns read Enquiry to Lost in order.
3. A new local copy opens with the made-up caterer's name on a new quote's PDF, GST at 9 percent, and catering sample records on every section.
4. The Copilot answers "Which events are in Deposit due?" with the right deals, using the new names.
5. A search of the repo for the old generic sample names finds none outside the history.
6. The spec files describe the catering stages and sample data.
