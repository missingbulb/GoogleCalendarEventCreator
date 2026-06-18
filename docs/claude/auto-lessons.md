# Automated daily "lessons" digest

A daily Claude **Opus** pass reviews the last 24h of activity and folds any
durable, reusable insights into the Markdown docs — the automated counterpart of
the on-demand **"learned lessons"** instruction (see `docs/claude/workflow.md`,
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
   `docs/technicalGotchas.md`, practices → `docs/engineeringPractices.md`,
   architecture → `docs/architectureGuidelines.md`, project mechanics →
   `docs/claude/*`.
5. **Most days: nothing** — no branch, no PR, no edits. That's what keeps the
   digest worth reading.

## Output: a PR, never a merge

If it found at least one genuinely new lesson, it opens a **PR for review** on a
`claude/lessons/<date>-<rand>` branch (the random suffix keeps two same-day runs
from colliding on one branch name). It never merges: a human reviews the PR — the
docs are guidance everyone reads, so a hallucinated or duplicative "lesson" is
worse than nothing — and "LGTM" from the repo owner triggers the merge-to-main
command (see `docs/claude/github.md`).
