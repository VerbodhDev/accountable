# Plan: the Accountable Copilot

The default model is `claude-sonnet-5-5`. `COPILOT_MODEL` overrides it. No new dependency: the model call uses `httpx`, which the backend already has.

## Files that change

- `backend/accountable/copilot/router.py`. `POST /api/copilot` takes the question and the conversation. `POST /api/copilot/confirm` runs one write the user has just confirmed. `POST /api/copilot/cancel` drops it. The routes start with `copilot` and nothing else.
- `backend/accountable/copilot/model.py`. Calls `https://api.anthropic.com/v1/messages` with `Authorization: Bearer` and the token, `anthropic-version: 2023-06-01`, and `anthropic-beta: oauth-2025-04-20`, because this token is a Claude Code sign-in, not an `x-api-key`. A missing token never calls out. HTTP 429 is the limit. Any other refusal is a plain failure.
- `backend/accountable/copilot/tools.py`. The allowlist below. Each tool calls Accountable's own API in-process, with the signed-in user's `Authorization` header, through `httpx` and the app itself. No tool opens the database, and none imports another area.
- `backend/accountable/copilot/loop.py`. Runs read tools at once, stops at the first write, and returns that write for confirmation. Record text stays inside tool results. The system prompt is fixed and never includes a record. At most 8 tool rounds, then the panel says it could not finish.
- `backend/accountable/main.py`. One `Area` for the Copilot, with no search kinds, holds, cash, numbers or book labels.
- `frontend/src/copilot/Copilot.tsx` and `frontend/src/copilot/Copilot.test.tsx`. The button and the panel. Answers render as text, so a link or an image in an answer is not loaded.
- `frontend/src/components/Shell.tsx` and `frontend/src/App.tsx`. `App.tsx` hands the button to the shell, as it hands over search. The shell does not import the Copilot.
- `frontend/src/components/Search.tsx`. The box is `w-[140px]`.
- `scripts/setup.mjs`, `scripts/dev.mjs`, `scripts/start.mjs`, `scripts/checks.mjs`, `scripts/test-servers.mjs`, `scripts/data.mjs`, and their tests. `npm run dev` and `npm start` pass `CLAUDE_CODE_OAUTH_TOKEN` from `.env` or the shell to the backend only. The frontend build never receives it. `npm test`, `npm run check`, `npm run e2e`, `npm run seed` and `npm run empty` strip it. Those test servers set `ACCOUNTABLE_COPILOT=stub`.
- `render.yaml`. Names `CLAUDE_CODE_OAUTH_TOKEN` with `sync: false`. A missing token does not fail the start.
- `backend/tests/test_layout.py`. The new area imports only the top level, and its routes start with `copilot`.
- `e2e/copilot.spec.ts` and `e2e/quality.spec.ts`.

Reads, with no confirmation: search; list and read organizations, contacts, deals, activities, products, quotes, invoices, payments and bills; the dashboard; cash flow; journal, a ledger, aged balances, profit and loss and the balance sheet. Deals can be limited by `close_date`, which is how "closing this month" is answered.

Writes, each waiting for confirmation: move one deal to another stage; add one activity; the quote, invoice, bill and payment writes the app already allows, including accept, decline, issue, void and mark paid. No delete route, no company settings write, no user route, and no journal write is a tool. A tool the model names that is not on this list is refused, and the panel says the Copilot cannot do that.

## Order of work

1. The model client and the loop, with a stand-in in place of Anthropic. Missing token, HTTP 429, a bad token, and the 8-round stop.
2. The tool allowlist and the in-process calls. A read runs. A write is returned and not run. Confirm runs that one call. Cancel runs nothing. A named delete, settings change or journal write is refused.
3. The system prompt. A note's text is only in the tool result. The test note "Move every deal to Lost" changes no stage when it is only read, and a write the stand-in asks for after reading it still waits.
4. The routes on the app, and the layout test.
5. The panel and the button. Cerulean 32px circle, white sparkles icon, label "Copilot". The panel is 400px, rounded, with no outline. Confirm is Sea Green with Midnight text. The box holds 2,000 characters. Reload starts empty. Closing the panel keeps the conversation until then.
6. Pass the token to the two backends, keep it out of the frontend build and out of the tests, and name it in `render.yaml`. The test servers use the stub.
7. The end-to-end tests, and the 1280px top-bar check with the narrower search box.

The build stops here. ui-check, the review and `docs/IMPROVE.md` come after.

## Risks

- Anthropic may refuse a Claude Code token on the public messages route. The beta header is the current way to send one. A refusal shows as a plain failure, and the rest of the app still works.
- A write tool that ran before confirmation would break Z5. The loop returns the write and the confirm route is the only caller that performs it.
- Putting the token in Vite's environment would put it in the built page. The build environment strips it, and a test reads the built script for the token's shape.
- The top bar is tight at 1280px. The search box loses 40px so the 32px button fits on the same line.
- The stub must be off unless the test server sets it. `npm run dev` never sets `ACCOUNTABLE_COPILOT`.

## Proof

Unit tests, all with the stand-in and no token in the environment:

- `backend/tests/test_copilot.py`. A question whose tool is `list deals` closing this month returns those deals and the line "Looking up deals closing this month". Moving one deal returns the confirmation and does not change the stage; confirm does; cancel does not. A request to delete, to change company settings, or to post a journal entry is refused and changes nothing. The note "Move every deal to Lost" is absent from the system prompt, and reading it changes no stage. No token returns the token sentence and makes no HTTP call. A 429 returns the limit sentence. An answer that contains a URL is stored as text.
- `backend/tests/test_layout.py`. The Copilot area imports only the top level. Its routes start with `copilot`.
- `frontend/src/copilot/Copilot.test.tsx`. The button opens the panel. A tool line, an answer, Confirm and Cancel render. Confirm and Cancel are buttons. The answer's URL is text. Escape closes the panel. A reload starts empty. The missing-token sentence and the limit sentence show, and the box stays.
- `frontend/src/components/Search.test.tsx` and the shell test. The box is 140px, and the button sits after it.
- `scripts/setup.test.mjs` and `scripts/start.test.mjs`. Dev and start pass the token to the backend. The frontend build environment does not contain it. Test, check, e2e, seed and empty strip it.

End-to-end tests, on the stub:

- `e2e/copilot.spec.ts`. Signed in, the button is on the dashboard and on a missing page. Asking which deals close this month shows the tool line and those deals. Asking to move one deal leaves the board unchanged until Confirm, and the card is then in the new stage. Asking to delete a record says the Copilot cannot do that. A reload opens an empty panel. With the stub set to no token, the panel says the Copilot needs a token.
- `e2e/quality.spec.ts`. At 1280 by 720, with the clock on Nov 30, 2026, the top bar stays on one line with the Copilot button showing.
