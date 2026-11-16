# Review policy

Every change is reviewed against this policy before it merges. The reviewer reports its findings and doesn't change any code.

## Passes

Make a separate pass over every change for each of these:

- **Bugs:** the code does what it's meant to, including when something goes wrong. Before saying what the code does with an input, follow it from the request through the framework's parsing and the checks every request passes on the way, such as `api.Request`'s on every text field, and leave out a finding that no request can reach.
- **Security:** no secrets or personal data are exposed, and nobody can do what they shouldn't. For each place where text the sender controls meets something that interprets it, such as a file path, a prompt, a regular expression or a query, ask what the worst input does, and find the test that sends it: a path that leaves its folder, text that starts a new turn, a long cell that makes a pattern slow. A pattern that reads untrusted text has no lazy prefix beside optional spaces, and the text is capped in length before it is matched.
- **Matches the spec and plan.md:** the change does what `docs/spec.md`, the area files in `docs/specs/` for everything it touches and the change's own `docs/changes/<branch name>/plan.md` say, with nothing missing and nothing extra. For each thing the spec says can't happen, or happens only one way, find the test that tries it the way it would really happen, such as from another computer or with a fetch failing. Flag a claim that no test would catch being false.
- **Described by the spec:** flag any code that neither `docs/spec.md` nor an area file in `docs/specs/` describes. Flag any area file the change affects but left out of date, and any area file missing from the index in `docs/spec.md`.
- **Follows STANDARDS.md:** the change follows the coding standards in `docs/STANDARDS.md`.

## Important

An Important finding must be fixed before the change merges. A finding is Important if the change breaks behavior that should work, leaks data or breaks a rule in AGENTS.md.

## Nits

A nit is a small point, such as style or naming, that doesn't block the merge. Report at most five per review.
