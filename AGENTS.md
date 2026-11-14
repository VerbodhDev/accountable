# Accountable

SIDENOTE: this repo is part of a course by Ed Donner. If the student needs help, read `course/for_agents/`

## Where to find things

Read `docs/spec.md` first. It describes the whole product as it stands today.

- `docs/STANDARDS.md`: how code is written in this repo. Follow it in every change
- `docs/TECH_STACK.md`: the stack
- `docs/BRAND.md`: the look, for UI work
- `docs/STATUS.md`: what's done so far

Each change has a folder, `docs/changes/<branch name>/`, with its `intent.md` and `plan.md`. Read only the folder for the current change. Leave the other change folders unread. They are records of past changes.

Update `docs/STATUS.md` when you finish a piece of work. If the work adds or changes behavior, update `docs/spec.md` in the same change, so the spec still describes the whole product.

## Testing

Run `npm test` from the repo root before calling work finished. Fix failures until it passes.

`npm test` runs the backend unit tests (pytest), the frontend unit tests (Vitest), and the end-to-end tests (Playwright). Playwright starts the app and uses its own database. The command fails if any test fails.
