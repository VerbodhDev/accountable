## Chosen layout

The owner chose the figures mockup. The file is docs/mockups/figures.html. The screenshot is docs/mockups/figures.png. The board mockup and the rail mockup are not the design.

The dashboard has a top bar, then five figures in one row. The line chart is full width under them. The bar chart and the funnel sit side by side. Recent activity and follow-ups sit side by side under the charts.

The pipeline has the same top bar. A panel shows the open pipeline and the expected revenue. Each column has a stage chip, the deal count, the value, the expected revenue, the cards, and Add deal.

## Look

The brand guidelines win over any general design guidance. Light mode is the default. The screen is for a laptop or a desktop. There is no phone layout. A narrow window scrolls. It does not rearrange into a phone page. The app does not follow the device's dark mode setting.

The top bar has one theme control on every page. In light mode it says Dark mode and it is off. In dark mode it says Light mode and it is on. This browser stores the choice on this computer. A reload keeps it. Any stored value other than dark is light mode.

Colors live in one set of tokens. A component does not set its own page, panel, or ink color.

| Use | Light | Dark |
|---|---|---|
| Page background | `#F0F4F5` | `#04232E` |
| Panels, cards, dialogs, and the top bar | White, rounded, no outline | Black, rounded, no outline |
| Headings and body | Instrument Sans | Instrument Sans |
| Money, dates, and counts | JetBrains Mono | JetBrains Mono |
| Accent | Instrument Serif is for a tagline or a quote. This version has neither, so it does not use that font | Same |
| Ink | Midnight `#073B4C` | Sea Mist `#CDD8DB` |
| Primary action | Sea Green `#06D6A0` with Midnight text | Same |
| Destructive confirm | Raspberry `#EF476F` with white text | Same |

Sea Green and Marigold are too bright for small text. Small text uses the ink token. Those colors are for fills, marks, and chart series. Text on a Sea Green, Marigold, or Coral fill stays Midnight in both modes.

Charts, dialogs, empty states, field errors, and banners use the page, panel, and ink tokens, so they follow the mode.

Do not put a border on one edge of a panel. Do not put a single line across the top of the page. Do not fill panels with gradients.

The top bar is a rounded panel, white in light mode and black in dark mode. It shows the name Accountable, the five sections, and the theme control. The control says Dark mode in light mode and Light mode in dark mode. The current section is a Sea Green pill with Midnight text.

| Mark | Color | Text |
|---|---|---|
| Lead | Cerulean `#118AB2` | White |
| Qualified | Marigold `#FFC145` | Midnight |
| Customer | Sea Green `#06D6A0` | Midnight |
| Late | Raspberry `#EF476F` | White |
| Overdue | Raspberry `#EF476F` | White |

Stage chips use these fills. Won uses a darker Sea Green than the open New stage.

| Stage | Fill | Text |
|---|---|---|
| New | Sea Green `#06D6A0` | Midnight |
| Qualified | Marigold `#FFC145` | Midnight |
| Proposal | Coral `#F78C6B` | Midnight |
| Negotiation | Cerulean `#118AB2` | White |
| Won | Darker Sea Green `#04614A` | White |
| Lost | Raspberry `#EF476F` | White |

Money always shows as US dollars, for example $1,250.00.

Labels are short. The tone is plain business English. There are no exclamation marks.

## Screens

| Screen | Route | Main content |
|---|---|---|
| Dashboard | `/` | The figures, the three visuals, recent activity, and follow-ups |
| Organizations | `/organizations` | The organizations table |
| Organization | `/organizations/:id` | The company, its contacts, and its deals |
| Contacts | `/contacts` | The contacts table and the status filter |
| Contact | `/contacts/:id` | The person, linked records, the timeline, and the log form |
| Deals | `/deals` | The deals table, with Late on late rows |
| Deal | `/deals/:id` | The deal, linked records, the timeline, and the log form |
| Pipeline | `/pipeline` | The six columns |

Add and edit open as dialogs. Delete opens a confirm dialog. The log form sits on the contact page and the deal page.

An empty table says there are no records yet and shows the add action. A search with no matches says there are no matches.

A field error is shown by that field. The dialog stays open.
