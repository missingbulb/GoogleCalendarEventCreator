# Handing portable lessons off to Claudinite

The shared rules under `docs/claude/shared/` are the **Claudinite** submodule,
consumed **read-only** here (see [workflow.md](workflow.md) and
[issue #364](https://github.com/missingbulb/GoogleCalendarEventCreator/issues/364)).
A session in this repo can't push to Claudinite, so a *portable* lesson — one that
generalizes beyond this project — can't be written into the shared docs directly.
This is the **up-path**: how such a lesson travels from here into Claudinite.

```
"learned lessons" (portable lesson)
        │  files a claudinite-lesson-labelled issue here
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
the lesson arrives back as a read-only rule
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
  form (pre-applies the label). The "learned lessons" pass can also just open a
  labelled issue directly; the template is for consistency and humans.
- The **`claudinite-lesson` label** — the trigger. It is drift-guarded across the
  workflow and template by `test/uber/shared_constants/claudinite-lesson-label.json`.

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
2. **Create the `claudinite-lesson` label in this repo** — GitHub silently drops an
   unknown label on issue creation, so the trigger won't fire until it exists
   (`gh label create claudinite-lesson --color BFD4F2 --description "Portable lesson to hand off to Claudinite"`,
   or via the Labels UI). The Action also creates it on the Claudinite side, but
   that needs the PAT to carry label perms — create it there by hand if not.
3. **Stand up the Claudinite curation routine** and its tracking issue (above).

Until 1–2 are done the hand-off can't run; until 3 is done a handed-off issue just
waits in Claudinite for a human.
