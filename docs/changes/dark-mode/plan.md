# Plan: dark mode

## Files that change

- `frontend/src/styles.css` holds the color tokens for light mode and for dark mode.
- `frontend/src/shell/theme.ts` reads and stores the choice.
- `frontend/index.html` applies a saved dark choice before the app paints.
- `frontend/src/main.tsx` applies the stored choice as the app starts.
- `frontend/src/shell/Shell.tsx` puts the Dark mode control on the top bar.
- `frontend/src/crm/Charts.tsx` uses the ink and grid tokens.
- Tests: `frontend/src/shell/theme.test.ts`, `frontend/src/shell/Shell.test.tsx`, and `e2e/theme.spec.ts`.
- Screenshots in `docs/changes/dark-mode/`.
- `docs/spec.md` and `docs/STATUS.md` describe the change.

## Order of work

1. Add the light tokens and the dark tokens. Point panels, dialogs, tables, and the top bar at those tokens. Keep Midnight as the text color on Sea Green, Marigold, and Coral.
2. Add the theme module and the top-bar control. Light is the default. Dark is stored in this browser. Any other stored value is light.
3. Apply a saved dark choice in the page before the app loads, and again when the app starts.
4. Point chart text, chart grid lines, and chart tooltips at the tokens. Leave stage fills and status marks on their current colors.
5. Write the unit tests and the end-to-end test.
6. Take the four screenshots after the checks pass.

## Risks

- A primary button that uses the dark ink token would put Sea Mist on Sea Green. Midnight stays the text color on those fills.
- Recharts colors written as hex would stay Midnight on a dark page. The chart text uses the ink token.
- A saved value other than `dark` must not turn dark mode on.
- Playwright starts its own server on ports 8000 and 5173. The dev server has to be stopped before that run.

## Proof

- `frontend/src/shell/theme.test.ts`: a missing value is light, `dark` is dark, any other value is light, and applying a choice sets the page and the stored value.
- `frontend/src/shell/Shell.test.tsx`: the top bar has the Dark mode control. Turning it on sets dark. Turning it off sets light.
- `e2e/theme.spec.ts`: the control starts off, a click turns dark mode on, and a reload keeps it on. The page reports no console errors.
- `npm run check` passes.
- Screenshots: `dashboard-light.png`, `dashboard-dark.png`, `pipeline-light.png`, and `pipeline-dark.png` in `docs/changes/dark-mode/`.
