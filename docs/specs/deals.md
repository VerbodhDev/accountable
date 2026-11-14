### Deal

A potential sale.

| Field | Required | Rule |
|---|---|---|
| Name | Yes | |
| Organization | Yes | The company the deal is with |
| Main contact | No | Must belong to that organization when set |
| Stage | Yes | New, Qualified, Proposal, Negotiation, Won, or Lost |
| Value | Yes | US dollars, zero or more |
| Probability | Yes | A whole number from 0 to 100 |
| Close date | No | The expected date while the deal is open. The actual date when the deal is Won or Lost |
| Position | Yes | The card's place in its column. The owner does not type this |

A new deal starts at New, unless the owner adds it from a pipeline column. Then it starts at that column's stage.

| Stage | Usual probability |
|---|---|
| New | 10% |
| Qualified | 30% |
| Proposal | 50% |
| Negotiation | 70% |
| Won | 100% |
| Lost | 0% |

When a deal changes stage, it takes the new stage's usual probability. A probability the owner typed stays until the next stage change. A stage change replaces that typed probability.

Expected revenue for one deal is its value times its probability, divided by 100.

A deal is open when its stage is not Won and not Lost. A deal is late when it is open and its close date is before today. Won and Lost deals are not late. A move to Won or Lost sets the close date to today when that date is empty.

The owner can move a deal to another organization. If the main contact is not at that organization, the app clears the main contact.

### Stage entry

When a deal moves to another stage, the app adds an entry on its own. The text is "Moved from Proposal to Negotiation", with the real stage names. The owner did not type it. It appears in that deal's timeline and in recent activity on the dashboard. The owner can delete it. The owner cannot edit its text.
