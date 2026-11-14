# Plan: theme label

## Files that change

- `frontend/src/shell/Shell.tsx` sets the button text from the current theme.
- `frontend/src/shell/Shell.test.tsx` checks both labels.
- `e2e/theme.spec.ts` checks the label before the click, after the click, and after a reload.
- `docs/spec.md` and `docs/STATUS.md` describe the label.

## Order of work

1. Make the button say Dark mode in light mode and Light mode in dark mode. Keep the pressed state.
2. Update the shell test and the end-to-end test to read the new label.
3. Run the checks.

## Risks

- A test that still looks for the name Dark mode after the click will fail, because that name is gone while the page is dark.
- The stored value does not change. Only the visible label changes.

## Proof

- `frontend/src/shell/Shell.test.tsx`: the control starts as Dark mode. After one click it says Light mode and the page is dark. After the next click it says Dark mode and the page is light.
- `e2e/theme.spec.ts`: the control starts as Dark mode, a click makes it say Light mode, and a reload keeps Light mode.
- `npm run check` passes.
