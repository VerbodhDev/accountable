# Intent: theme label

## Problem

When dark mode is on, the top-bar button still says Dark mode. The way back to light mode is not clear.

## Proposed outcome

While the page is light, the button says Dark mode. While the page is dark, the button says Light mode.

## Constraints

- The control stays on every page.
- Light mode stays the default, and the browser still remembers the choice.
- The control is off in light mode and on in dark mode.
- Colors stay as they are. No new dependencies.

## Not in this change

- Following the device's own dark mode setting.
- A layout for phones.
- Any other label or color change.

## Success criteria

1. npm run check passes.
2. The end-to-end test proves the label is Dark mode in light mode, Light mode in dark mode, and Light mode after a reload.
