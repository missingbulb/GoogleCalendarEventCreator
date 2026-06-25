# Automated daily "lessons" digest

A daily Claude **Opus** pass reviews the last 24h of activity and folds any
durable, reusable insights into the Markdown docs — the automated counterpart of
the on-demand **"learned lessons"** instruction (see `dev/procedures/claude/workflow.md`,
which defines what makes a *good* lesson and where each kind belongs). It runs
unattended, so most days it correctly adds **nothing**.

## How it finds lessons (scoped to the last 24h)

1. **Activity gate, first.** Count commits + updated issues/PRs in the window. If
   there were none, stop — a quiet day has nothing to learn from.
2. **Read the window.** The last-24h **commits** (`git log --since`, full bodies,
   diffs where a fix is non-obvious) and **issue/PR activity** (`updated:>=<since>`,
   then the changed comments).
3. **Extract only durable, reusable lessons** — gotchas, engineering practices,
   test discipline, architecture rules, project mechanics — and **dedupe** each
   against the existing docs. When in doubt, leave it out; adding noise is worse
   than adding nothing.
4. **Route each to the doc that owns it**, keeping every addition terse: gotchas →
   `dev/procedures/technicalGotchas.md`, practices → `dev/procedures/engineeringPractices.md`,
   architecture → `dev/procedures/this_project/highLevelDesign.md`, project mechanics →
   `dev/procedures/claude/*`.
5. **Most days: nothing** — no branch, no PR, no edits. That's what keeps the
   digest worth reading.

Its write surface is **Markdown docs only** — never code, tests, or workflows. If
an edit lands in a doc a test reads (e.g. one tracked under
`dev/procedures/test/uber/shared_constants/`), run `npm install` if needed then
`npm run test:offline` and keep it green before pushing.

## Output: a PR, never a merge

If it found at least one genuinely new lesson, it opens a **PR for review** on a
`claude/lessons/<date>-<rand>` branch (the random suffix keeps two same-day runs
from colliding on one branch name). It never merges: a human reviews the PR — the
docs are guidance everyone reads, so a hallucinated or duplicative "lesson" is
worse than nothing — and from there it merges through the usual flow (see
`dev/procedures/claude/github.md`). The PR references this routine's tracking issue (see
below), so its activity is collected there.

## Tracking: log each run under the routine's own issue

When a run produces a PR, log it on this routine's standing tracking issue — the
*Auto-Improvements Tracker - Lessons Learned* issue (find it **by title**,
currently **#365**, not a hard-coded number; if it doesn't exist, open it). Log
the run as a
**dated comment** on that issue — **not** a sub-issue — so it accumulates a
scrollable history of every run over time; also reference the issue from the PR
(`Refs #365`). The issue is long-lived: if it was **closed**, **reopen it** when a
run needs logging (a closure while the routine is still producing PRs is stale),
matching the open-branch report's behavior
([auto-branch-report.md](auto-branch-report.md)). Each daily automated routine
keeps its **own** such issue — a running self-improvement log of what it did over
time. **This applies to future daily routines too:** when a new one is added, open
its own tracking issue and log its output the same way — as comments (e.g. the
fallback extractor coverage routine logs to #366 — see
[auto-fallback-coverage.md](auto-fallback-coverage.md)).
