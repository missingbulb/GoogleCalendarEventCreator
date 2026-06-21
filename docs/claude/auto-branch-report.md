# Automated nightly open-branch status report

A nightly Claude **Opus** Claude Code routine that reports every open branch's
status against `main` and which are safe to delete — the scheduled version of the
manual branch analysis. It is **read-only on the repo**: it never pushes, deletes,
or merges anything; its only writes are a comment on its standing tracking issue
(#399) when the branch picture has changed, and reopening that issue if it was
closed while branches still need tracking. Like the lessons/fallback digests it
stays **silent when nothing moved** — an unchanged night posts no comment.

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
3. **Superseded-elsewhere — content absorbed into `main` in a different form.**
   A branch can be obsolete even when step 1 finds no merged PR and step 2 still
   shows its files as branch-side additions: its *work* may have landed in `main`
   under a **different path or form** — a doc distilled into another doc, a feature
   re-implemented elsewhere, a lesson folded into a canonical file — so a pure
   file/line diff never matches and the branch reads as "unmerged." Before
   concluding a branch is unmerged work (step 5), ask whether its **intent** already
   exists in `main`: take the branch's signature change (the file it adds, the
   capability it documents) and look for that same intent in `main` —
   `git cat-file -e origin/main:<path>` for the exact file, then `git grep`/`git
   show origin/main:<file>` for the *concept* if the path differs. If `main` already
   carries the work in any form (and any hook/code it documents has shipped), the
   branch is **superseded** ⇒ *safe to delete* — note in Details where the content
   now lives. This is a content/judgment read, not a mechanical diff; all of it is
   **nondestructive** — reads against `origin/main` only, never a pull/merge into
   the working tree. (Worked example: a branch adding a standalone
   `docs/devEnvironmentSetup.md` whose guidance had been distilled into
   `docs/agenticBestPractices.md` on `main`, with its hook already shipped — invisible
   to step 2, caught here.)
4. **No common ancestor ⇒ orphaned.** If `git merge-base origin/main origin/<b>`
   fails, `main`'s history was rewritten out from under the branch (a force-push).
   Flag it **orphaned (pre-rewrite)**: its commits can't be mechanically proven in
   or out of `main`, so report it as *needs a human eye* — never an automatic
   safe-to-delete.
5. Otherwise the branch has genuine commits/content not in `main` ⇒ **unmerged
   work** — *do not delete*; describe what it carries.

Start each run with `git fetch origin --prune` so the view is current (note any
branch the prune removed).

## Report format

A Markdown table, most-recent-activity first:

| Branch | Last commit (date) | Ahead | PR | Status | Safe to delete? |

`Status` ∈ `merged/stale` · `superseded` · `unmerged work` · `orphaned
(pre-rewrite)`. Below the table, a **Details** subsection: one short paragraph per
branch with commits ahead that isn't merged, describing its changes — and for a
`superseded` branch, where in `main` its content now lives. End with a one-line
recommendation of which branches are safe to delete.

## Where it posts

The report lands on the standing issue titled
**`Open Branches Cleanup Tracker`** (find it **by title** — currently
**#399**, not a hard-coded
number; if it doesn't exist, open it). Then decide whether to post by **what
changed**, so the issue stays a signal rather than a daily wall of identical
tables — read the most recent comment on the issue to compare against:

- **No branches other than `main`** → **do nothing**: no comment, no reopen.
  There's nothing to track.
- **Open branches exist but the issue is closed** → **reopen it** (it's
  long-lived; a closure while branches still need tracking is stale). Reopening is
  itself the signal, so it happens regardless of the comment decision below.
- **This run's report is substantially identical to the last one posted** (same
  set of branches, and same status + safe-to-delete for each) → **don't comment**.
- **The report changed** (a branch appeared or was pruned, or any branch's status
  or safe-to-delete flipped) → **post it** as a new dated comment, so the issue
  accumulates a scrollable history.

## The launcher (Claude Code Routine)

Keep the routine's config a **thin pointer** to this doc, not an inlined spec (per
[shared/agenticBestPractices.md](shared/agenticBestPractices.md) — inlined instructions
drift against renamed paths and miss conventions the repo later adds). Paste this
into the nightly routine:

> Run the nightly open-branch status report for this repository exactly as
> specified in `docs/claude/auto-branch-report.md`: analyze every open branch's
> status against `main` (squash-aware, per that doc), then post to the routine's
> standing tracking issue (#399) only per that doc's rules — comment when the
> branch picture changed, stay silent when it didn't, reopen the issue if it was
> closed while branches still need tracking, and do nothing when no branches but
> `main` exist. You are read-only on the repo — never push, delete, or merge.

Schedule it nightly in the Claude Code Routines UI; the repo can't schedule
itself, so the doc is the spec and the routine is the trigger.
