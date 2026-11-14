# Intent: phone view

## Problem

Accountable is locked to a laptop width. On a phone or a tablet the page scrolls sideways, and the top bar, figures, and pipeline do not fit.

## Proposed outcome

A window narrower than 900px rearranges into a phone layout. The same records, actions, and colors stay. Wider windows stay as they are.

## Constraints

- The brand colors, type, and panels stay.
- No new records, routes, or languages.
- The page itself does not scroll sideways. A wide table or the pipeline scrolls inside its own panel.

## Not in this change

A language selector. A native phone app. A different set of screens for a phone.

## Success criteria

- At 390px and at 768px the dashboard, a list, and the pipeline are usable without sideways page scroll.
- At a laptop width the existing layout stays.
