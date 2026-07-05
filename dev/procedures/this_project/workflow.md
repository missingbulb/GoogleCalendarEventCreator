# Workflow

The GitHub issue → branch → PR → merge lifecycle, the **merge-to-main command**,
and the CI-interaction practices live in [github.md](github.md). This file holds the
project-specific working rules, plus the two owner-triggered defined instructions
("bump version", "learned lessons").

Whenever a change regenerates the UI gallery (via `npm run refresh:ui`), link the
branch's copy in the chat in the same turn you commit it — the requirement-first
inline gallery
`https://github.com/<owner>/<repo>/blob/<branch>/dev/requirements/requirements.md`, each
requirement with its snapshot beside it — for one-page review.

The general principle — a moved snapshot/golden baseline needs owner approval, not
silent regeneration — is a portable testing practice maintained outside this repo.
The project
process when a change to a `dev/requirements/<kind>/cases/*` case (its spec or its
rendering) makes the snapshot tests **fail** (the pixels moved):

1. **Surface the diff immediately, don't carry on.** Revert the baseline to the
   committed **expected** PNG, run the snapshot test so it fails (the harness
   writes the rendered `actual` and a highlighted `diff` to `dev/requirements/shared/.artifacts/`),
   and send three images to the chat: **expected** (committed), **actual**
   (newly-rendered), and the **diff**. When the change alters the PNG's
   **dimensions** (e.g. a fixture shrink), pixelmatch can't diff unequal sizes so
   the harness writes only `actual` (no `diff`) — stitch **expected** and
   **actual** side-by-side into one image for the review instead.
2. **Ask via `AskUserQuestion`, not prose** — a popup notifies the owner on
   mobile. Offer **Approve** and **Reject — let's discuss**.
3. **Hold without overwriting the expected image.** If the working tree must be
   committed while waiting (e.g. a stop-hook), commit the *reverted* (expected)
   baseline so the branch/PR honestly shows the snapshot test **red, pending
   approval** — never commit the new baseline first.
4. On **Approve**: regenerate the baseline (`npm run refresh:ui`), confirm the
   suite is green, and push. On **Reject**: **do not** roll back automatically —
   leave the change in place and discuss how to proceed.

When the repo owner says **"bump version"**, treat it as a defined instruction
to cut a release **end to end** — bump, merge, and wait for the published
artifact — not just to open the bump PR:

1. Raise the extension's version by editing the `version` field in **both**
   `extension/manifest.json` and `package.json` (they must stay in sync), and
   update the `value` in
   `dev/procedures/test/uber/shared_constants/version-sync.json` to match, on a
   branch. Default to a **minor** bump (`x.Y.z` → `x.(Y+1).0`); honor an
   explicit target ("bump version to 1.4.0") or level ("bump patch" / "bump
   major") when given.
2. Open the PR and get CI green, then merge it to `main` via **squash**,
   appending `(#N)` to the title. Saying "bump version" is itself the
   authorization to merge **this** bump PR — a deterministic, version-only
   change — overriding the merge-needs-its-own-approval default for this case
   only.
3. The merge triggers the **Release: Create Package** workflow, which builds the
   new release and publishes a `vX.Y.Z` GitHub Release with a refreshed
   `google-calendar-event-creator.zip` asset (it no-ops if that version is
   already the latest release; it never changes the version itself). **Do not
   report the release done until that workflow has completed and the new
   `vX.Y.Z` Release with its updated zip asset is published** — poll for it
   (the shell can't observe GitHub state here; use the GitHub MCP tools, on the
   short-interval back-off in [github.md](github.md)). Reporting at merge time
   races the async build: a follow-up "deploy to Chrome store" would then ship
   the *previous* version's artifact.

When the repo owner says **"learned lessons"**, treat it as a defined
instruction to run the lessons-learned pass — the method, the friction signals,
and the "no new lessons is valid" bar are a portable practice maintained outside
this repo (dedupe ruthlessly, route each lesson to the doc that owns it, most
runs add nothing) — over the current conversation, on **Opus**, since the
reflection needs the stronger model. Otherwise it runs only when the repo owner
asks for it — never extract from a conversation unprompted.

As part of the same pass, also run the standing **efficiency analysis** of the
conversation's tool/process usage — the general rule (fewer operations, less
wall time without harming quality, killing a process once its output is in
hand, a terse verdict) is a portable agentic practice maintained outside this
repo. Route any resulting speed-up like any other lesson: a project mechanic to
the matching `dev/procedures/this_project/*`, a portable practice to
`dev/procedures/general/agenticBestPractices.md`.

**Always write to the local repository docs** — capture never reaches across to
Claudinite. Route by scope:

- **Project-specific** lessons: project mechanics to the matching file under
  `dev/procedures/this_project/` (workflow, github, testing, adding-a-source,
  auto-extractor);
  top-level project architecture rules to the "Architecture rules of the road"
  section of `dev/procedures/this_project/highLevelDesign.md`;
  non-obvious **project-wide** codebase footguns to `dev/procedures/this_project/technicalGotchas.md`
  (file-local footguns go in the file instead — see the next bullet).
- **File-local** footguns go in the file, not `dev/procedures/this_project/technicalGotchas.md`. A trap
  you'd only trip over *while editing one specific file or function* — a mistake
  of **commission** you make with that file open in front of you — belongs in
  that file's **top-of-file header comment** (the self-documenting convention
  [testing.md](testing.md) already mandates for test harnesses, generalized to
  any footgun). It loads into context **on-demand** when Claude reads the file,
  can't drift from the code, and stays off the always-loaded `CLAUDE.md` budget —
  every `@import` is expanded at launch *every* session, so a file-specific note
  in `technicalGotchas.md` taxes every unrelated session. **Keep it central
  instead** when Claude could hit the trap *without* reading the locus file: a
  mistake of **omission** (you must know it to decide whether to open or avoid
  the file) or a cross-cutting invariant spanning files. One file can split both
  ways — `extension-test/harness.js`'s jsdom traps ("`body.innerText` is null",
  "`<noscript>` parses into live DOM") stay central in `technicalGotchas.md` (a
  generic extraction can hit them without ever reading the harness), while the
  harness's own `runScripts: "dangerously"` fragment-parsing mechanic lives inline
  in its header (you only meet it editing the harness). Co-locate only
  **non-portable** traps:
  a portable lesson buried in a code comment escapes the practice docs where general
  lessons belong, so those still go to the practice docs below.
- **Portable** lessons (general engineering practices, agentic best practices):
  to the local working-set docs `dev/procedures/general/engineeringPractices.md` and
  `dev/procedures/general/agenticBestPractices.md`. These are local capture surfaces; the curated,
  project-agnostic canon lives read-only in the Claudinite canon synced into this
  repo over HTTPS. Don't try to edit the shared docs or file a Claudinite
  issue here — just write the best local doc.

Keeping these local docs reconciled with the canon (pruning a local copy once the
canon comes to cover it) is Claudinite's responsibility, not this repo's.

Keep every addition terse. Project-specific guidance is good; broader engineering
practices that generalize beyond this repo are better — write those to the local
practice docs rather than burying them in project-specific files.

When you author an instruction, optimize the instruction paragraph for Claude
reading it into context: state the rule and its constraints, and cut motivation,
hedging, and explanation from the paragraph itself. If the *why* is worth keeping,
put it in a separate follow-up sentence or parenthetical after the instruction,
never woven into it. (Why: the instruction loads into context every session that
touches the doc, so prose padding dilutes the signal for no gain; explicitness is
nearly free to write and is what prevents a wrong guess, so spend words on
constraints and examples, not justification; and a rule's rationale helps a human
reviewer but is noise to the agent once the rule is settled, so it belongs outside
the instruction it explains.)
