# Automated daily "optimize procedures" routine

A daily Claude **Opus** Claude Code routine that is the **only** bridge between
this repo's local documentation and the shared **Claudinite** rules. Everything
else — the "learned lessons" command, the daily auto-lessons digest — writes
**only to local docs** (see [workflow.md](workflow.md)); this routine is what
reconciles those local docs against Claudinite in both directions. Like the other
daily routines it runs unattended and **most days changes little or nothing** —
the steady state is already reconciled, so a forced move is worse than none.

It does two independent things each run; either can be a no-op.

## 1. Pull **down**: prune / rephrase local docs the canon now covers (→ a PR)

The shared canon arrives here as the read-only submodule `dev/procedures/claude/shared/`,
kept current by the Dependabot bump PRs (see [github.md](github.md) /
[claudinite-handoff.md](claudinite-handoff.md)). When Claudinite has **absorbed** a
practice that a local doc still carries — most often an item this routine promoted
on an earlier run (see direction 2), now merged into the canon and pulled in by a
submodule bump — the local copy is now redundant. The routine:

- **Removes** the now-duplicated local item (typically from the local working-set
  docs `dev/procedures/engineeringPractices.md` / `dev/procedures/agenticBestPractices.md`, but any
  local doc qualifies), since the canon is the single source of truth.
- **Rephrases / reframes** a local procedure when Claudinite's wording of the same
  idea has changed, so the local docs stay consistent with the canon they point
  at.

These edits go out as a single **PR for review** (never an auto-merge). Only
remove a local item you can show is genuinely covered by the *current pinned*
canon — quote the shared-doc line. When in doubt, leave it; a wrongful prune loses
a real local lesson.

## 2. Push **up**: promote generalizable local items (→ an issue, not a removal)

Scan the local docs for insights that are **portable** — they'd help unseen
projects, not just this repo (general engineering/agentic practices, portable
git/GitHub procedure, working-discipline or agent-architecture principle) — and
that Claudinite does **not** already cover. Collect all such items and **open one
`claudinite-lesson`-labelled issue** listing them — each entry a complete,
self-contained proposal (Claudinite won't have this repo's context) stating the
lesson, the shared doc it belongs in, and why it's portable. **One issue, not one
per item:** the hand-off Action copies it to a single Claudinite issue, where the
curation routine dedupes/routes each lesson and opens **one** docs PR for the
batch — so many proposals can't collide as separate same-doc PRs that conflict on
merge. The curator is the real filter (it confirms and dedupes against the whole
corpus), so **propose broadly and let it choose** what to keep rather than
pre-filtering hard here ([claudinite-handoff.md](claudinite-handoff.md)).

**Do not remove the promoted item from the local docs now.** Promotion is a
*proposal*; Claudinite may reject or reword it. Removal happens **later**, on the
day direction 1 sees the item actually land in the canon (after the Claudinite PR
merges and a submodule bump pulls it in). So a promoted-but-not-yet-accepted item
keeps working locally in the meantime, and a rejected one simply stays local.

**Ensuring the label won't explode:** before applying `claudinite-lesson`, ensure
it exists idempotently (`gh label create claudinite-lesson --color BFD4F2
--description "Portable lesson to hand off to Claudinite" 2>/dev/null || true`, or
the MCP equivalent) — create-if-missing, no-op if present. So the routine never
needs the label pre-created and never errors on a re-run.

## Discipline

- Be conservative in **both** directions: a forced promotion spams Claudinite, a
  wrongful prune deletes a real lesson. Most days, few or no items qualify.
- Keep the suite green: if a PR edits a doc a test reads, run `npm install` if
  needed then `npm run test:offline` before pushing (it covers `docs-reachable`
  and the shared-constants guards).
- Compare local docs against the **currently pinned** submodule canon, not a live
  fetch of Claudinite — the pin is what this repo actually consumes, and Dependabot
  keeps it current.
- Never edit `dev/procedures/claude/shared/` (read-only) and never merge anything itself.

## Output & tracking

- Direction 1 produces a **PR** on `claude/optimize-procedures/<date>-<rand>`
  (the random suffix keeps two same-day runs from colliding); direction 2 produces
  **one bundled issue**. Never a merge.
- Log each run that produced a PR or an issue as a **dated comment** on this
  routine's own standing tracking issue — the *Auto-Improvements Tracker -
  Optimize Procedures* issue (find it **by title**, not a hard-coded number; open
  it if missing, reopen it if it was closed while the routine is still producing
  output), matching the own-tracking-issue convention of the other daily routines
  ([auto-lessons.md](auto-lessons.md) #365,
  [auto-fallback-coverage.md](auto-fallback-coverage.md) #366). A quiet day logs
  nothing.

## The launcher (Claude Code Routine)

Keep the routine's config a **thin pointer** to this doc, not an inlined spec (per
[shared/agenticBestPractices.md](shared/agenticBestPractices.md)). Paste this into
the daily routine:

> Run the daily "optimize procedures" routine for this repository exactly as
> specified in `dev/procedures/claude/auto-optimize-procedures.md`: reconcile the local docs
> against the pinned Claudinite shared rules in both directions — open a PR that
> prunes/rephrases local docs the canon now covers, and open **one** bundled
> `claudinite-lesson` issue (ensuring the label exists first) listing every
> generalizable local item not yet in Claudinite, **without** removing them locally.
> Follow that doc's discipline, keep `npm run test:offline` green, log the run on
> the routine's standing tracking issue per the doc, and never merge anything.

Schedule it daily in the Claude Code Routines UI; the repo can't schedule itself,
so the doc is the spec and the routine is the trigger.

(This doc will eventually be promoted to Claudinite like any portable routine, but
stays here for now.)
