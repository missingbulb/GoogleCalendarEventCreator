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
thing that starts the up-path: it spots the generalizable local items and **files a
single `claudinite-lesson` issue** (bundling them all) that this doc's Action then
carries upward.

```
optimize-procedures routine (daily)
        │  files ONE claudinite-lesson issue here, bundling every item (ensuring the label exists first)
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
  It's deterministic — no agent — and bounded to issue plumbing. It triggers on the
  **label alone**, not on any issue template (there is no dedicated form): the
  optimize-procedures routine files its issue programmatically with the fields in
  the body, and a human filing one by hand opens a plain issue carrying the
  lesson(s) and applies the label. Either way the body holds the proposal. And it
  fires the instant the label lands (including at issue creation), copying + closing
  within seconds, so it's **effectively irreversible from this side**: to withhold a
  borderline item, decide *before* filing and don't apply the label — removing the
  label afterward loses the race, and the already-created Claudinite copy then has
  to be closed in Claudinite, which a session scoped only to this repo can't reach.
- The **`claudinite-lesson` label** — the trigger. The optimize-procedures routine
  **ensures it exists idempotently** before applying it (create-if-missing,
  no-op-if-present), so it needs no manual pre-creation and never errors on a
  re-run. It is drift-guarded on the workflow by
  `test/uber/shared_constants/claudinite-lesson-label.json`.

## The token

The Action copies cross-repo, which the automatic `GITHUB_TOKEN` **cannot** do, so
it uses a repo secret **`CLAUDINITE_ISSUE_TOKEN`**: a fine-grained PAT with
**Issues: Read and write** scoped to **`missingbulb/Claudinite` only**. The
back-link comment and the close happen on *this* repo and use the built-in
`GITHUB_TOKEN` (the PAT is Claudinite-scoped and can't write here).

## The Claudinite-side curation routine (lives in Claudinite, not here)

A Claude Code routine wired to the `claudinite-lesson` label **in the Claudinite
repo** does the judgment step: dedupe **each lesson** carried in the issue against
the existing shared docs, drop the ones that aren't genuinely new/portable, route
the rest to the docs they own, and open **one docs PR** for the whole batch (never
a direct edit), referencing the issue. Folding the issue's lessons into a single
PR is the other half of the no-collision design (the consumer side bundles them
into one issue — see [auto-optimize-procedures.md](auto-optimize-procedures.md)):
many same-doc edits land together instead of as rival PRs that conflict on merge.
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
