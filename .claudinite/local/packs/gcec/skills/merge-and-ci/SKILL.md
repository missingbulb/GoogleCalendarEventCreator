---
name: merge-and-ci
description: Drive this repo's PR-to-merged flow cheaply — when to open the PR, how to get CI green in a Claude web session, how to poll without wasting wall time or tokens, and when to arm auto-merge instead of waiting. Use whenever a session opens, watches, or lands a PR here — including one opened incidentally mid-task by an unattended or scheduled run, and any moment you ask "is CI green yet?" — not only for a deliberate merge or an e2e/heavy/UI change. The same poll discipline governs watching any forced/dispatched Actions run to a terminal state, PR or not.
metadata:
  body: guidelines
  force-load-on-tool-calls:
    - 'mcp__github__actions_run_trigger'
---

# Merge and CI in this repo

The merge itself: squash, `(#N)` appended to the title, CI green first (twice
for e2e/heavy-browser changes), approval-applies-only-backward — see the gcec
pack's RULES.md. This skill is the *how*: the environment facts and the poll
discipline that keep a merge cheap in wall time and tokens (from a post-mortem
on treating CI as a fixed poll-and-sleep ritual).

## Open the PR early when the only reviewable output is on CI

A change that adds or modifies an e2e/heavy-browser (`dev/requirements/heavy/`)
or UI-snapshot (`dev/requirements/{popup,icon}/`) test has reviewable artifacts
that only exist on a PR (the sandbox's Chromium can run the heavy suite locally, but
CI is the gate): CI runs the heavy/e2e suites against the branch, and a UI change's
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
- **Poll check state through MCP, not a shell loop.** Whether the shell holds
  an API token varies by session (`gh api rate_limit` tells in one call), so
  don't build the wait on it; the MCP poll is the reading that always works.
- **Loop MCP poll → background sleep → MCP poll, and always wait for the sleep's
  completion notification before the next poll** — the same loop for watching a
  forced Actions run to completion, not only a PR's check. Issuing the next poll
  right after launching the sleep was measured firing the follow-up MCP call 2–3s
  into a 5–30s backgrounded sleep, seven times in 54s, while watching a forced
  `claudinite-scheduler.yml` run (#1230). While a sleep runs, do real work
  (review the diff, draft the PR body) or end the turn.
- **Pass `run_in_background: true` on every sleep in that loop, starting with
  the first 5s call — not only once a bare one gets blocked.** The harness
  accepts a short foreground `sleep` but rejects a standalone `sleep 30`
  (`"Blocked: standalone sleep 30 ... use run_in_background: true"`), so a
  loop that starts foreground hits the block right at the 30s step and pays a
  failed Bash call plus an unused `ToolSearch` for `Monitor` before recovering
  with the same sleep, backgrounded. Measured identically in three separate
  sessions, always at the same step, always recovered the same way: #892
  (~10s lost), #894 (~7s), #903 (~6s).
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
- **…but expect the arming itself to be refused here.** On this repo's single
  required `test` check there is essentially no window to arm in, so try once,
  and otherwise poll to green and merge. **A green, conflict-free PR that merely
  failed to arm is never `needs-human`.** Measured, in session `2925ea4b`
  (2026-07-30): four arming attempts on PR #793 between 03:46:04Z and 03:54:00Z,
  after which the run converged dispatch #794 to `needs-human` and stopped — the
  PR had been green since 03:52:32Z and sat unmerged until the owner stepped in
  at 04:38:33Z. **46 minutes of avoidable idle plus a hand-cleared escalation.**

## After the merge, `git fetch origin main` — never check `main` out

Canon no longer syncs `main` post-merge by default; it syncs only for
continued work, via `checkout main && reset --hard origin/main`. **Fetch
anyway**: `git fetch origin main` is all this repo needs — the checkout is
what reliably stalls or gets denied.

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

**The fetch is denied sometimes too — one retry, then move on.** The permission
classifier is non-deterministic and not scoped to the checkout: the bare
`git fetch origin main` has been denied outright, and an identical immediate retry
has both failed and succeeded. Each denial costs 30–45s, and nothing downstream
needs the fetch — a run that was denied twice ran `capture-log.mjs` anyway and the
capture landed. So: one retry, and a denial is never an error to report, escalate,
or work around. Decomposing the command or switching tools to get the same bytes
spends the session's last minutes on a sync that buys nothing.
