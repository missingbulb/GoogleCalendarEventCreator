# Automated nightly open-branch status report

A nightly Claude **Opus** Claude Code routine that reports every open branch's
status against `main` and which are safe to delete — the scheduled version of the
manual branch analysis. It is **read-only on the repo**: it never pushes, deletes,
or merges anything; its only write is one comment per run on its standing tracking
issue (#399). Unlike the lessons/fallback digests, a quiet repo still gets a
(terse) report — this is a status heartbeat, not a change digest.

## What it reports

For every remote branch except `main`:

- **commits ahead** of `main` (`git rev-list --count origin/main..origin/<b>`);
- **real status**, squash-aware (the crux — see below);
- **open PR**, if any — from the **GitHub MCP tools** (`list_pull_requests` /
  `search_pull_requests`), never `gh`/`curl`: the shell here reaches a git-only
  proxy with no GitHub API (see [github.md](github.md));
- **safe to delete?** — yes only when the branch's content is already in `main`.

And for every branch with commits ahead that is **not** already merged, a 1–3
sentence **description of the changes** it carries (from its commit
subjects/bodies and diffstat) — so the table is actionable without checking out
each branch.

## The crux: raw "commits ahead" is misleading — be squash-aware

`main` is **squash-merged** — one commit per PR (see [github.md](github.md)) — so a
branch whose work has already landed *still* shows its original commits as "ahead"
of `main`: the squash created a new commit the branch's own commits are
unreachable from. **"Ahead by N" never, by itself, means "unmerged."** Decide the
real status by what the branch's *content* does against `main`:

1. **PR state — authoritative for merged.** Via the GitHub MCP tools, find the
   branch's PR. A **merged** PR ⇒ the work is in `main` ⇒ *safe to delete*, however
   many commits show ahead.
2. **Content vs. `main` — catches a squash with no PR, and stale branches.**
   Two-dot `git diff --stat origin/main..origin/<b>`: if everything the branch
   adds is already present in `main` (its new files/lines don't show up as
   branch-side additions), it's merged-or-stale ⇒ *safe to delete*. Spot-check the
   branch's signature files with `git cat-file -e origin/main:<path>`.
3. **No common ancestor ⇒ orphaned.** If `git merge-base origin/main origin/<b>`
   fails, `main`'s history was rewritten out from under the branch (a force-push).
   Flag it **orphaned (pre-rewrite)**: its commits can't be mechanically proven in
   or out of `main`, so report it as *needs a human eye* — never an automatic
   safe-to-delete.
4. Otherwise the branch has genuine commits/content not in `main` ⇒ **unmerged
   work** — *do not delete*; describe what it carries.

Start each run with `git fetch origin --prune` so the view is current (note any
branch the prune removed).

## Report format

A Markdown table, most-recent-activity first:

| Branch | Last commit (date) | Ahead | PR | Status | Safe to delete? |

`Status` ∈ `merged/stale` · `unmerged work` · `orphaned (pre-rewrite)`. Below the
table, a **Details** subsection: one short paragraph per branch with commits ahead
that isn't merged, describing its changes. End with a one-line recommendation of
which branches are safe to delete.

## Where it posts

Find the open standing issue titled **`Daily routine log: open-branch status
report`** (by title — currently **#399**) and add the report as a new dated
comment, so the issue accumulates a scrollable history. If that issue doesn't
exist, open it first (long-lived, never closed). To stay quiet when nothing moved:
if this run's table is substantively identical to the previous comment, post a
one-line `No change since <date>` instead of repeating it; if there are no
branches besides `main`, post a one-line all-clear.

## The launcher (Claude Code Routine)

Keep the routine's config a **thin pointer** to this doc, not an inlined spec (per
[../agenticBestPractices.md](../agenticBestPractices.md) — inlined instructions
drift against renamed paths and miss conventions the repo later adds). Paste this
into the nightly routine:

> Run the nightly open-branch status report for this repository exactly as
> specified in `docs/claude/auto-branch-report.md`: analyze every open branch's
> status against `main` (squash-aware, per that doc), and post the report as a
> comment on the routine's standing tracking issue (#399). You are read-only on
> the repo — never push, delete, or merge anything.

Schedule it nightly in the Claude Code Routines UI; the repo can't schedule
itself, so the doc is the spec and the routine is the trigger.
