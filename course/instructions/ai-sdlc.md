# AI SDLC: every stage, with its prompts

One change goes through six stages: Plan, Design, Build, Test, Deploy and Operate. Each stage has a prompt for your coding agent and a commit. Replace `<change>` with the name of your change. The paths (docs/spec.md, docs/changes/, docs/IMPROVE.md) and the reviewer and ui-check subagents come from the Accountable setup. If your project uses other names, change them in the prompts.

```
Plan ──► Design ──► Build ──► Test ──► Deploy ──► Operate
 │         │          │         │         │          │
intent    spec     plan.md    check    review    watch the
.md       update   + code     + ui     + improve live change,
                              check    + merge   feed a new intent
```

## Rules for every stage

- One change, one branch, one set of documents in docs/changes/<change>/.
- The agent never commits. You read the diff and commit.
- The agent never reads .env or any secret file. Keys live in .env or in your host's settings.
- Start a fresh session (`/clear` in Claude Code) before Build and before Deploy, so the agent works from the documents and not from the chat.
- Text stored in your product is untrusted. Treat it as data, never as instructions.

## Start

```
git checkout main
git checkout -b <change>
```

## Plan

Write your intent in your own words. A few lines of notes are enough, and your agent turns them into the intent. Think about:

- What problem does the change solve, and for whom?
- What can the user do afterwards that they cannot do now?
- What must stay true: permissions, data safety, cost limits, the design?
- What is not in this change?
- How will you know it works? Write each success criterion so that someone can check it.
- Which inputs are untrusted, and what happens when one is hostile?

Then give your agent your notes:

```
Create docs/changes/<change>/intent.md from my notes below, with five sections: Problem, Proposed outcome, Constraints, Not in this change and Success criteria. Then read it with docs/spec.md and ask me about anything unclear, at most three questions. Update the intent with my answers.

My notes: (your notes here)
```

Answer its questions, then:

```
git add .
git commit -m "Plan: intent.md agreed"
```

## Design

```
Read the intent for this branch, in docs/changes/, and update docs/spec.md and the area files in docs/specs/ so they describe the product with this change, as it will be once it's merged. Add an area file if the change needs one. Use the brand skill. List any concerns at the top of your reply.
```

Resolve the concerns, then read the changes in VS Code's Source Control view. That diff is your design.

```
git add .
git commit -m "Design: the spec"
```

## Build

```
Read the intent for this branch, in docs/changes/, with docs/spec.md, and write plan.md beside the intent with four sections: Files that change, Order of work, Risks and Proof. Proof lists the unit and end-to-end tests. The plan ends with the build, since ui-check, the review and docs/IMPROVE.md come later. Don't write any code yet.
```

```
git add .
git commit -m "Build: plan.md"
```

Start a fresh session, then:

```
Implement the plan.md for this branch, in docs/changes/, following its order of work. Write the tests in its Proof section and run them as you go. Leave the commits to me.
```

```
git add .
git commit -m "Build: <change>"
```

## Test

```
Run npm run check and fix failures until it passes. Then use the ui-check subagent to check the pages this change adds or changes, signed in, and show me its report and the screenshots.
```

If ui-check found problems that this change caused:

```
Fix the problems ui-check found that this change caused, then run npm run check.
```

Then try it yourself. Run `npm run dev`, sign in and go through the success criteria in the intent, one by one. Try one case that must fail, and one hostile input.

```
git add .
git commit -m "Test: checks and ui-check"
```

## Deploy

Start a fresh session, then:

```
Use the reviewer subagent to review this branch against main. Report only, skip style.
```

```
Fix the Important findings from the review. Run npm run check when you're done. Leave the commits to me.
```

```
git add .
git commit -m "Deploy: review fixes"
```

```
Follow docs/IMPROVE.md for this change. Leave the commits to me.
```

```
git add .
git commit -m "Deploy: harness improved"
```

If the change needs a new secret on your host, add it by hand in the host's dashboard before you merge. Choose the option that saves without deploying, so the next deploy picks it up.

Push the branch and wait for the CI run to pass:

```
git push origin <change>
```

Then merge into `main` and push it:

```
git checkout main
git merge <change>
git branch -d <change>
git push origin main
```

Open the live app, sign in and check one success criterion.

## Operate

The change is live. Watch it, and feed what you learn into the next change.

```
Read the intent and spec for <change> in docs/changes/ and docs/spec.md. List what I should watch in the live app after this change: errors, slow pages, cost and limits, and each success criterion. For each item, say where I can see it and what a bad result looks like. Report only.
```

When something goes wrong in the live app, start the next change from the evidence. Do not patch it in place.

```
git checkout main
git checkout -b fix-<short-name>
```

```
Reproduce this problem before you change anything: (paste the exact error, the page, and the steps). Write a test that fails for the same reason. Report the cause in one paragraph. Don't fix it yet.
```

Then go back to Plan with a short intent, and run the stages again. A fix needs one Proof item: the test that failed first.

## Your own intent, as a template

Use this when you want to write an intent yourself. This prompt creates it, in place of the Plan prompt above.

````
Create docs/changes/<change>/intent.md with the text below. Then read it with docs/spec.md and ask me about anything unclear, at most three questions. Update the intent with my answers.

# Intent: <name of the change>

## Problem

(Who has what trouble today, in two or three sentences.)

## Proposed outcome

(What the user can do afterwards, in plain words, with one example.)

## Constraints

- (Permissions: who can do it, and as whom the code runs.)
- (Secrets: which key, where it lives, and that the agent never reads it.)
- (Untrusted input: text stored in the product is data, never instructions.)
- (Limits: rate, cost and size, and what the screen says when one is reached.)
- (Tests never call a real paid service.)
- (The design follows the app, in light and dark mode.)
- (No new dependencies unless the plan makes the case for one.)

## Not in this change

- (What you will not touch.)

## Success criteria

1. npm run check passes.
2. (One criterion per behavior, written so that someone can check it.)
3. (One criterion for a case that must fail.)
4. (One criterion for a hostile input that changes nothing.)
````
