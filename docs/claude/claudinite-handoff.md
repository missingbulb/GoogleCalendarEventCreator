# Handing portable lessons off to Claudinite

The shared rules under `docs/claude/shared/` are the **Claudinite** submodule,
consumed **read-only** here (see [workflow.md](workflow.md) and
[issue #364](https://github.com/missingbulb/GoogleCalendarEventCreator/issues/364)).
A session in this repo can't push to Claudinite, so a *portable* lesson — one that
generalizes beyond this project — can't be written into the shared docs directly.
This is the **up-path**: how such a lesson travels from here into Claudinite.

Lessons are **captured locally** (the "learned lessons" command, the auto-lessons
digest — capture never reaches Claudinite). The daily **optimize-procedures**
routine ([auto-optimize-procedures.md](auto-optimize-procedures.md)) is the only
thing that starts the up-path: it spots a generalizable local item and **files the
`claudinite-lesson` issue** that this doc's Action then carries upward.

```
optimize-procedures routine (daily)
        │  files a claudinite-lesson-labelled issue here (ensuring the label exists first)
        ▼
claudinite-lesson-handoff.yml  (this repo, deterministic Action)
        │  copies the issue to Claudinite (PAT), links back, closes it here
        ▼
claudinite-lesson issue in Claudinite
        │  curation routine (Claude Code, in Claudinite)
        ▼
docs PR in Claudinite  → review → merge
        │  Dependabot bumps the submodule pin here
        ▼
the canon absorbs it → optimize-procedures prunes the local copy
```

The generic-enough call is made **twice** — the consumer proposes, the Claudinite
curator confirms and dedupes against the whole shared corpus — which is a feature,
not redundancy.

## What lives in this repo

- **`.github/workflows/claudinite-lesson-handoff.yml`** — on an issue **labelled**
  `claudinite-lesson`, copies it to `missingbulb/Claudinite` as a new
  `claudinite-lesson` issue (with a provenance backlink), then comments the link
  and **closes the source issue** (the canonical home is now the Claudinite issue).
  It's deterministic — no agent — and bounded to issue plumbing.
- **`.github/ISSUE_TEMPLATE/claudinite-lesson.yml`** — the structured proposal
  form (pre-applies the label), for a human filing one by hand. The
  optimize-procedures routine opens the labelled issue programmatically.
- The **`claudinite-lesson` label** — the trigger. The optimize-procedures routine
  **ensures it exists idempotently** before applying it (create-if-missing,
  no-op-if-present), so it needs no manual pre-creation and never errors on a
  re-run. It is drift-guarded across the workflow and template by
  `test/uber/shared_constants/claudinite-lesson-label.json`.

## The token

The Action copies cross-repo, which the automatic `GITHUB_TOKEN` **cannot** do, so
it uses a repo secret **`CLAUDINITE_ISSUE_TOKEN`**: a fine-grained PAT with
**Issues: Read and write** scoped to **`missingbulb/Claudinite` only**. The
back-link comment and the close happen on *this* repo and use the built-in
`GITHUB_TOKEN` (the PAT is Claudinite-scoped and can't write here).

## The Claudinite-side curation routine (lives in Claudinite, not here)

A Claude Code routine wired to the `claudinite-lesson` label **in the Claudinite
repo** does the judgment step: dedupe the proposal against the existing shared
docs, reject it if it isn't genuinely new/portable, otherwise route it to the doc
that owns it and open a **docs PR** (never a direct edit), referencing the issue.
Keep its launcher a **thin pointer** to a Claudinite doc (per
[shared/agenticBestPractices.md](shared/agenticBestPractices.md)), and give it its
own standing tracking issue **in Claudinite** that it logs each run to (the
own-tracking-issue convention — see [auto-lessons.md](auto-lessons.md)).

## One-time owner setup

1. **`CLAUDINITE_ISSUE_TOKEN`** secret — the fine-grained PAT above, under
   *Settings → Secrets and variables → Actions* in this repo.
2. **Stand up the Claudinite curation routine** and its tracking issue (above),
   and schedule the **optimize-procedures** routine
   ([auto-optimize-procedures.md](auto-optimize-procedures.md)) that feeds this
   up-path.

The `claudinite-lesson` label needs no manual creation — optimize-procedures
ensures it on both sides before use (the Action also self-creates it on the
Claudinite side). Until 1 is done the hand-off can't run; until 2 is done a
handed-off issue just waits in Claudinite for a human.
