# Portable git & GitHub procedures (local working set)

Portable git/GitHub gotchas captured here, not yet in the shared canon
([claude/shared/git-and-github.md](../claude/shared/git-and-github.md)).
`optimize-procedures` promotes these up and prunes them once the canon absorbs
them (capture is always local — see [claude/workflow.md](../claude/workflow.md)).

## Sync early to keep merge conflicts small

Conflict size scales with how long a branch lives and how far it drifts from the
default branch. Sync early rather than at the end: when starting work on a branch,
merge (or rebase onto) the latest default branch first, so the branch carries the
latest sources instead of discovering the gap at merge time. A one-commit-per-PR
squash history keeps each branch a single reviewable unit, so shorter-lived
branches are the norm.

## Open the PR early when the reviewable artifact only exists on CI

The usual default is to hold a PR until asked. **Reverse that when a change's only
reviewable output is produced by CI** — an e2e / heavy-browser run, or a rendered
artifact (a UI-snapshot pixel diff, a generated gallery) that can't be exercised in
the local sandbox. Opening the PR *is* how you see the change working and surface
failures, so doing it up front — rather than after local-only iteration that proves
nothing for these classes — is the faster path to a working, reviewable result.
Each CI iteration costs a full round-trip, so get the first one running as early as
possible.

## Renaming a directory that houses a submodule

**`git mv` on a directory containing a submodule updates `.gitmodules` and the
index but leaves `.git/config` stale — run `git submodule sync && git submodule
update --init` after.** git rewrites `.gitmodules` and the index correctly, but the
local `.git/config` keeps the old `[submodule "<old/path>"]` entry, so any
operation that consults `.git/config` (submodule status, checkout) sees the stale
path until `git submodule sync` propagates the new path and `git submodule update
--init` re-registers it. Always run both after renaming a directory that houses a
submodule.

## Re-read a file after `git mv` before rewriting it

**`git mv` leaves the moved file looking unread to the editing tool — a write in
the same batch silently refuses, leaving the file stale.** The common reorg move is
`git mv old new` then rewrite `new`; an editing tool that tracks reads by path sees
the moved path as never-seen and rejects the write. Re-read the file at its **new**
path before editing it. And check each result in a batched set of tool calls: a
single refused write buried in a batch is easy to miss, and the stale
(moved-but-not-rewritten) file surfaces much later as a confusing error far from its
cause.

## GitHub renders Markdown inside a `<td>` only with surrounding blank lines

GitHub's cmark-gfm re-enters Markdown mode inside a raw `<td>` only when blank
lines surround the cell's content — without them the cell is treated as a raw HTML
block and shown verbatim (no `![img]()`, no `**bold**`, no links). A leading inline
`<!-- … -->` also starts an HTML block, so keep any marker as the **last** token on
the line so the line still *starts* as Markdown. The sanitizer strips `style`/CSS
(a flexbox `<div>` two-column won't render) but keeps `<table>` +
`align`/`valign`/`width`; a GFM pipe-table cell can't hold multi-line prose, so use
the raw `<table>` form when a cell needs it.
