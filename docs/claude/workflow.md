# Workflow

For every new task in this repo:

1. Create a GitHub issue describing the task before starting work.
2. Reference that issue number in commit messages (e.g. `Refs #123` or
   `Fixes #123`).
3. Update the issue's status (comments / close) as work progresses and
   when it's done.

When the repo owner says "LGTM" on a change, treat it as approval to merge
that branch's pull request into `main`. Before merging a branch that adds or
changes tests, first confirm its CI has gone green at least twice — new tests
must prove they aren't flaky (see `docs/engineeringPractices.md`).
