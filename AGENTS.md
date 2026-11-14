# Accountable

SIDENOTE: this repo is part of a course by Ed Donner. If the student needs help, read `course/for_agents/`

## Where to find things

Read `docs/spec.md` first. It is the short summary of the whole product. Then read only the area files under `docs/specs/` that the current change touches.

- `docs/STANDARDS.md`: how code is written in this repo. Follow it in every change
- `docs/TECH_STACK.md`: the stack
- `docs/BRAND.md`: the look, for UI work
- `docs/STATUS.md`: what's done so far

Each change has a folder, `docs/changes/<branch name>/`, with its `intent.md` and `plan.md`. Read only the folder for the current change. Leave the other change folders unread. They are records of past changes.

Update `docs/STATUS.md` when you finish a piece of work. If the work adds or changes behavior, update `docs/spec.md` and the area files that change, in the same change, so the spec still describes the whole product.

At Deploy, follow `docs/IMPROVE.md` after the review fixes and before the merge.

## Testing

Run `npm run check` from the repo root before calling work finished. Fix failures until it passes.

`npm run check` runs Prettier, ESLint, ruff format, ruff check, tsc, ty, and gitleaks. It then runs the test suites. Unit test coverage must be at least 80 percent. The command fails if any check fails.

`npm run check:quick` runs the same checks without the end-to-end tests.

A lefthook pre-commit hook formats the staged files, then runs lint, types, and gitleaks. It skips the tests. Grok runs `npm run check:quick` when a turn ends. A failure is sent back once, and the next stop is allowed. Edits to .env are blocked.

GitHub Actions runs the job named check on every push. It scans for secrets first, then runs `npm run check:quick`. The end-to-end tests stay in `npm run check` on the computer.

`npm run format` fixes Prettier and ruff formatting.

`npm test` runs the backend unit tests (pytest), the frontend unit tests (Vitest), and the end-to-end tests (Playwright). Playwright starts the app and uses its own database. The command fails if any test fails. Coverage is enforced by `npm run check`, not by `npm test` alone.
