---
name: merge-and-ci
description: Drive this repo's PR-to-merged flow cheaply — when to open the PR, how to get CI green in a Claude web session, how to poll without wasting wall time or tokens, and when to arm auto-merge instead of waiting. Use whenever a session opens, watches, or lands a PR here — including one opened incidentally mid-task by an unattended or scheduled run, and any moment you ask "is CI green yet?" — not only for a deliberate merge or an e2e/heavy/UI change.
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

- **The push-run exists — don't dispatch a duplicate.** A push through the
  in-session git proxy **does** trigger `test.yml`: the workflow's `push`
  trigger covers `main` and `claude/**` precisely so an agent branch gets CI
  without a PR, and a branch that also has an open PR gets a `pull_request` run
  too (two `test` check runs on the same head SHA — the workflow's own comment
  calls that accepted duplication). Merge on whichever is green; only reach for
  `actions_run_trigger` / `run_workflow` when no run appeared at all (a branch
  outside `claude/**`, or a `paths-ignore`/`[skip ci]` push). Firing a manual
  dispatch on top of a run that already exists just buys a third run and its
  wall time.
- **The shell can't observe GitHub state here.** The git remote is a git-only
  proxy (smart-HTTP under `/git/<owner>/<repo>/…`; every other path 400s),
  there's no API token in the env, and `gh` reaches no `api.github.com` — only
  an MCP poll sees check state; a background bash/Monitor loop cannot.
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
- **Won't sit and poll to green? Arm auto-merge — never end a turn on a
  subscription.** A run that opens a PR it can't watch to the end (an
  unattended/scheduled run, or a fix opened incidentally mid-task) should
  `enable_pr_auto_merge` with `SQUASH` and finish: this repo's
  `maintenance.delivery` is `auto-merge`, so GitHub lands it the moment the
  checks pass, with no turn held open and no human in the loop. Ending the turn
  "waiting for CI events" instead strands the PR until a person notices —
  measured, in session `558026a0` (2026-07-24): both `test` runs were green at
  03:58:27Z, the turn had ended at 03:57:56Z on a `subscribe_pr_activity` watch,
  and PR #718 sat unmerged until the owner stepped in **63 minutes** later.
  That one avoidable wait was 85% of the session's 74-minute wall clock.
- **…but expect the arming itself to be refused here, and read the refusal as
  state, not as failure.** On this repo's single required `test` check,
  `enable_pr_auto_merge` has essentially no window: while the run is queued or
  `in_progress` GitHub refuses *"unstable status (required checks are
  failing)"*, and the moment it completes green it refuses *"already in clean
  status … you can merge directly."* Neither is an error to escalate — the
  first means poll on the back-off above and retry, the second means the merge
  is available **now**, so squash-merge it, which is the same end state the
  arming was for. **A green, conflict-free PR that merely failed to arm is never
  `needs-human`.** Measured, in session `2925ea4b` (2026-07-30): four arming
  attempts on PR #793 between 03:46:04Z and 03:54:00Z (two "unstable", two
  "clean"), after which the run converged dispatch #794 to `needs-human` and
  stopped — the PR had been green since 03:52:32Z and sat unmerged until the
  owner stepped in at 04:38:33Z. **46 minutes of avoidable idle plus a
  hand-cleared escalation**, on a change nothing was wrong with. So don't spend
  a turn on repeated arming attempts: try once, and otherwise poll to green and
  merge.

## After the merge, `git fetch origin main` — never check `main` out

The canon merge recipe's post-merge step 5 is
`git checkout main && git pull origin main`. **Skip the checkout here**: a plain
`git fetch origin main` is all this repo's remaining post-merge work needs, and
the checkout is the one part that stalls or gets denied.

Nothing downstream reads the working tree. The capture step that follows the
merge (`capture-log.mjs`) does every branch write through git plumbing against
the *fetched* remote tip and never touches the checkout or the index — its own
header says so. The conformance checks resolve their diff base from
`origin/main`, a remote-tracking ref a fetch alone advances. So the checkout
buys nothing but a working-tree switch nobody asked for, at the very end of a
session that is about to end anyway.

Measured across the four captured sessions, all of which ran the canon step
verbatim: in `295e2230` (2026-07-26) the auto-mode classifier **denied**
`git checkout main` twice — once inside a `fetch && checkout && pull` chain
(08:26:09→08:26:39, 30s) and once alone (08:27:13→08:27:40, 27s) — 57s of dead
wall time plus three recovery calls, after which the session read the capture
script's header and concluded the checkout had never been needed. The bare
`git fetch origin main` in between succeeded on the first try. The same step
cost 44s in `13a6f736` and 8s in `558026a0` for no benefit either. Leave the
tree on the merged branch and fetch.
