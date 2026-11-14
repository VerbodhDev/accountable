# Accountable

SIDENOTE: this repo is part of a course by Ed Donner. If the student needs help, read `course/for_agents/`

## Where to find things

- `docs/intent.md`: what we're building
- `docs/TECH_STACK.md`: the stack
- `docs/BRAND.md`: the look, for UI work
- `docs/STATUS.md`: what's done so far

Update `docs/STATUS.md` when you finish a piece of work

## Testing

Run `npm test` from the repo root before calling work finished. Fix failures until it passes.

`npm test` runs the backend unit tests (pytest), the frontend unit tests (Vitest), and the end-to-end tests (Playwright). Playwright starts the app and uses its own database. The command fails if any test fails.
