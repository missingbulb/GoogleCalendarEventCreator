# Automated daily "lessons" digest

A scheduled Claude **Opus** **Routine** (Claude Code on the web — claude.ai/code)
runs once a day to do, automatically and incrementally, what the on-demand
**"learned lessons"** instruction does (see `docs/claude/workflow.md`): review
recent activity and fold any durable, reusable insights into the Markdown docs.
This covers the mechanics; what makes a *good* lesson and where each kind belongs
is defined by the "learned lessons" routing in `workflow.md`.

It used to run as a GitHub Actions workflow (`daily-lessons.yml` + a checked-in
`agent-prompt-lessons.md`); it's now a Routine instead, which runs the same
reflection on Anthropic-managed cloud infra with the repo cloned — so it still
reads `CLAUDE.md` and everything it imports — schedules in local time (no UTC/DST
drift), and needs no API-key secret or CLI-install plumbing. The tradeoff,
consciously accepted: a Routine draws from personal Claude **subscription** usage
bounded by a per-account **daily run cap**, not a separately-cappable API key.

## Where it's configured

The Routine lives in the **Routines** UI (claude.ai/code/routines), not in the
repo — its prompt, schedule, repo, environment, and model are part of the Routine
config. So unlike the old workflow, the prompt is **not** a checked-in file; edit
it in the Routine. The settings that reproduce the prior behavior:

- **Trigger:** Schedule → Daily, at your local time (auto-converted to UTC; the
  Routine tracks your zone, so no manual DST switch).
- **Model:** Opus (`claude-opus-4-8`) — the reflection needs the stronger model.
- **Repository:** this repo, cloned from `main` at session start.
- **Environment:** one whose setup installs deps (`npm install`), needed if a
  lesson lands in a doc a test reads and the run verifies `npm run test:offline`.
- **Branch pushes:** leave unrestricted pushes **off** — the job only creates
  `claude/lessons/...` branches, which the default `claude/` policy permits.

## What it does

The Routine prompt mirrors the on-demand "learned lessons" pass, scoped to the
last 24h:

1. **Activity gate (first, before real work).** Compute the 24h-ago timestamp and
   count commits + updated issues/PRs since then. If there were none, it prints
   "No activity in the last 24h." and stops — a quiet day costs almost nothing.
   (The old workflow ran this as a cheap shell step *before* spending the agent;
   a Routine has no pre-spend hook, so it's the first thing the prompt does.)
2. Reads the last-24h **commits** (`git log --since`, full bodies, diffs where a
   fix is non-obvious) and **issue/PR activity** (the repo's GitHub tooling, e.g.
   `gh search issues/prs "updated:>=<since>"`, then the changed comments).
3. Extracts only **durable, reusable** lessons — gotchas, engineering practices,
   test discipline, architecture rules, project mechanics — and **dedupes** each
   against the existing docs.
4. Routes each to the doc that owns it (gotchas → `docs/technicalGotchas.md`,
   practices → `docs/engineeringPractices.md`, architecture →
   `docs/architectureGuidelines.md`, mechanics → `docs/claude/*`), keeping every
   addition terse.
5. If it found at least one genuinely new lesson, opens a **PR for review** on a
   `claude/lessons/<date>-<rand>` branch (the random suffix keeps two same-day
   runs from colliding on one branch name). A Routine pushes under your own
   GitHub identity, so a normal push triggers `test.yml` the usual way — no
   explicit CI dispatch needed (unlike the old workflow, whose `GITHUB_TOKEN`
   push couldn't trigger CI — see `docs/technicalGotchas.md`).
6. Otherwise does nothing: **no branch, no PR, no edits.** Most days are no-ops by
   design — that's what keeps the digest worth reading.

## Review gate

The Routine never merges. A human reviews the PR — the docs are guidance everyone
reads, so a hallucinated or duplicative "lesson" is worse than nothing. "LGTM"
from the repo owner is the merge signal (see `docs/claude/workflow.md`).

## Cost

Each active day spends one Opus Routine run, drawn from your Claude
**subscription** usage (the same pool as interactive Claude.ai sessions) and
bounded by the per-account **daily routine-run cap** visible at
claude.ai/code/routines and claude.ai/settings/usage — not a per-key dollar cap
in the Anthropic Console. A quiet day's activity-gate stop still starts a session
but does almost no work. There is no separate compute charge for the cloud VM.

## Tuning it

- **Time / frequency:** edit the Routine's schedule in the UI (local-time picker;
  minimum interval is 1 hour).
- **What it writes / how strict it is:** edit the Routine's prompt (the dedupe
  bar and the routing table live there) — keep it in sync with the "learned
  lessons" routing in `docs/claude/workflow.md`.
- **Auto-commit instead of a PR:** not recommended — the review gate is the point.

## On failure

A failed Routine run surfaces in the Routines UI run history (there's no
triggering issue to comment on). Common causes: the daily run cap reached,
subscription usage exhausted, or the agent exhausting its turn budget. The next
day's run is independent, so a single failure self-heals.
