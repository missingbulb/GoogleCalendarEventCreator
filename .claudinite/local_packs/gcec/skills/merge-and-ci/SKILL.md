---
name: merge-and-ci
description: Drive this repo's PR-to-merged flow cheaply — when to open the PR, how to get CI green in a Claude web session, and how to poll without wasting wall time or tokens. Use when merging a change, waiting on CI, or opening a PR that touches e2e/heavy/UI tests.
---

# Merge and CI in this repo

The merge itself: squash, `(#N)` appended to the title, CI green first (twice
for e2e/heavy-browser changes), approval-applies-only-backward — see the gcec
pack's RULES.md. This skill is the *how*: the environment facts and the poll
discipline that keep a merge cheap in wall time and tokens (from a post-mortem
on treating CI as a fixed poll-and-sleep ritual).

## Open the PR early when the only reviewable output is on CI

A change that adds or modifies an e2e/heavy-browser (`dev/requirements/heavy/`)
or UI-snapshot (`dev/requirements/{popup,icon}/`) test can't be exercised
locally — the sandbox has no Chrome — and its reviewable artifacts only exist
on a PR: CI runs the heavy/e2e suites against the branch, and a UI change's
reviewable output (the pixel diff GitHub renders, the inline gallery in the
branch's `dev/requirements/requirements.md`) needs a pushed branch to view at
all. Open the PR early for those.

## Getting a green check in a Claude web session

- **There is no push-run to merge on.** A push through the in-session git proxy
  triggers **no** `test.yml` run (the proxy push emits no workflow-triggering
  event — same practical outcome as the `GITHUB_TOKEN` rule). **Dispatch it
  yourself** (`actions_run_trigger` / `run_workflow` on the branch ref —
  `test.yml` allows `workflow_dispatch`) and poll that one run to green before
  merging. Don't sit waiting for a push-run that never comes. (From a local
  CLI, the push-run exists — check the PR head SHA for a green required check
  and merge on that instead of firing a duplicate.)
- **The shell can't observe GitHub state here.** The git remote is a git-only
  proxy (smart-HTTP under `/git/<owner>/<repo>/…`; every other path 400s),
  there's no API token in the env, and `gh` reaches no `api.github.com` — only
  the MCP `get_check_runs`/`get_status` poll sees check state; a background
  bash/Monitor loop cannot.
- **Poll on a short back-off, never one long sleep, never tight.** Loop
  **MCP poll → background sleep → MCP poll** until the check leaves
  `in_progress`, backing off **5s, 10s, 15s, 30s, then 30s** repeating — a
  fast run wakes you within seconds, a slow one isn't tight-polled. Always wait
  for the sleep's completion notification before the next poll. While a sleep
  runs, do real work (review the diff, draft the PR body) or end the turn —
  filler calls to look busy are tight-polling in disguise.
- **Don't reach for `subscribe_pr_activity` to wait for green** — its webhooks
  never deliver CI **success** (only failures/comments/reviews), so the
  transition you're waiting for never arrives. It's for babysitting a PR, not
  merge-on-green.
- **Batch tool loading**: one `ToolSearch` for every GitHub MCP tool the flow
  needs (`issue_write`, `create_pull_request`, `pull_request_read`,
  `merge_pull_request`), not one per turn.
