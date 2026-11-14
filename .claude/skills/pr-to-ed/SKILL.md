---
name: pr-to-ed
description: >
  Open a pull request to Ed Donner's course repo, ed-donner/accountable.
  Use when the user says share with Ed, push a PR to Ed, open a community_contributions
  pull request, or runs /pr-to-ed. Follow course/for_agents/AGENT_GIT_GUIDE.md.
metadata:
  platform: all
---

# Pull request to Ed

Share work with Ed by a pull request into `ed-donner/accountable`. The course rules are in `course/for_agents/AGENT_GIT_GUIDE.md`. This skill is the procedure. Read the guide when a case below does not fit.

`origin` stays `git@github.com:ed-donner/accountable.git`. The student's fork is the remote `fork`. Push the share branch to `fork`. Never push the student's `main`, and never push a share branch, to `origin`.

Use `git checkout`. Do not use `git switch`. Do not change git config. Do not force-push. Do not skip hooks. Write the commit message to a file and commit with `git commit -F`.

## What goes in the pull request

The folder is `community_contributions/verbodh-pte/` unless the user names another folder.

Copy only the files the user asked to share. When they say today's documents, or the Day 3 share, copy these and nothing else:

- `docs/intent.md`
- `docs/spec.md`
- `docs/plan.md`
- `docs/REVIEW.md` (the file may be stored as `docs/review.md`)
- a short `README.md` in the contribution folder

The README says what was built, in a few lines, and links to `https://github.com/<login>/accountable`. Get `<login>` from `gh api user --jq .login`. Before that link is used, `git push fork main` so the fork's `main` has the build. That push goes to `fork`, not `origin`.

Leave every file already in the contribution folder on disk. Do not delete one, and do not stage one, unless the user named it.

Day 4 shares `docs/STANDARDS.md` and `docs/IMPROVE.md`, with no README. Day 5 shares the two subagent files, with no README. A piece larger than the checks below is one write-up markdown file in the same folder, with a link to the fork. A bug fix in Ed's own files is a different pull request: branch from the branch that has the bug, and only after the user has agreed to send it.

## Steps

1. Note the current branch. If a dev server is running from this worktree, stop it. Checking out Ed's `main` removes the app from the worktree.
2. Stash the student's other changes by path. Do not stash the contribution folder. `git status` should show only that folder as untracked.
3. `git fetch origin`.
4. Create the share branch from Ed's main: `git checkout --no-track -b <branch> origin/main`. Use a new branch name when one is already used by an open pull request, unless the user is updating that pull request.
5. Copy the files into the contribution folder. Stage them by name. Do not `git add` the folder.
6. Run the checks below. Stop before the commit if any check fails, return to the student's branch, and restore the stash.
7. Commit. `git diff --numstat origin/main...HEAD` must still pass the checks.
8. `git push -u fork <branch>`.
9. If a pull request from this head is already open, report its URL. Otherwise:

```
gh pr create --repo ed-donner/accountable --base main --head <login>:<branch> --title "<short title>" --body-file <file>
```

The title and the body say what the folder contains, in a line or two. The base is Ed's `main`.

10. `git checkout` the branch from step 1. `git stash pop` if step 2 stashed. The shared files must still be in the contribution folder. If checkout removed them, restore those paths from the share branch and then unstage them, so they sit in the worktree and the student's branch stays uncommitted. Do not touch the other files in the folder.
11. Start the dev server again if step 1 stopped it.

## Checks

Run these on `git diff --numstat origin/main...HEAD` before the push:

- At most 5 files.
- Every path is under `community_contributions/<folder>/`.
- No deleted lines. A new file shows `0` in the deleted column.
- No API key, token, password, or `.env` contents.
- No test files, no `.env.example`, no emoji.
- The README is a few lines. The day's documents may be longer than 2,000 lines. Anything else stays under 2,000 lines changed.
- The diff does not contain the app. `frontend/`, `backend/`, `package.json`, and the rest of the build stay on the student's fork.

If a check fails, do not push. Fix the staged set, or switch to a one-file write-up.

## Report

Give the pull request URL, the base, the head, the file list, and the additions and deletions. Say that Ed's `main` was not pushed to. Say which existing files in the contribution folder were left out of the pull request.
