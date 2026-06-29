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
silent regeneration — is in
[../general/testingPractices.md](../general/testingPractices.md). The project
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
instruction: review the current conversation — on Opus, since the reflection
needs the stronger model — and extract only the *important*, durable guidelines
worth keeping, then add them to the doc that owns each one. Be selective: the bar
is a genuinely new, reusable insight (a gotcha, practice, architecture rule, or
project mechanic), not a routine detail or a restatement of something already
documented — dedupe against the existing docs. **"No new lessons" is a valid,
common outcome**: if nothing clears the bar, say so and make no edits rather than
padding the docs to look productive. Run this same pass after a merge to main,
too — the merge-to-main command in [github.md](github.md) hands off to it:
reflect on the just-merged conversation before closing out. Otherwise it runs
only when the repo owner asks for it — never extract from a conversation
unprompted; the owner decides when to do it.

As part of the same pass, also run an **efficiency analysis** of the
conversation's tool/process usage — separate from the durable-lessons extraction
above, with its own equally high bar. Look at what ran after each user command:
which dev/tools/processes fired, how many of each, and how long each took. Then ask
whether the work could have been done with **fewer operations** (redundant or
repeated calls, work that could have been batched into one call, polling that
could have been a single wait) and whether it could have finished in **less wall
time without harming quality** (serial calls that had no dependency and could
have run in parallel, padded `sleep`s, an unnecessarily long path to the result).
Flag specifically any process that **returns its result but then wastes time on
shutdown** — one that could be safely killed once its output is in hand rather
than waited out. Close with a **terse verdict**: either one concrete speed-up
recommendation (route it like any other lesson — a project mechanic to the
matching `dev/procedures/this_project/*`, a portable practice to `dev/procedures/general/agenticBestPractices.md`),
or an explicit **"no changes recommended"**. The bar is high — most
conversations won't yield a new process note, so "no changes recommended" is the
common, expected outcome; don't manufacture one.

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
  a portable lesson buried in a code comment escapes the optimize-procedures
  promotion path, so those still go to the practice docs below.
- **Portable** lessons (general engineering practices, agentic best practices):
  to the local working-set docs `dev/procedures/general/engineeringPractices.md` and
  `dev/procedures/general/agenticBestPractices.md`. These are local capture surfaces; the curated,
  project-agnostic canon lives read-only in the Claudinite canon synced into this
  repo over HTTPS. Don't try to edit the shared docs or file a Claudinite
  issue here — just write the best local doc.

You never hand a lesson to Claudinite at capture time. The daily
**optimize-procedures** routine ([auto-optimize-procedures.md](../general/auto-optimize-procedures.md))
is the *only* thing that bridges to Claudinite: it later promotes generalizable
local items up (via a `claudinite-lesson` issue) and prunes the local copy once
the canon absorbs it. So a portable insight captured locally isn't "stuck" here —
it travels up on its own.

Keep every addition terse. Project-specific guidance is good; broader engineering
practices that generalize beyond this repo are better — write those to the local
practice docs so optimize-procedures can carry them upstream.

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

A scheduled workflow runs this same pass automatically once a day over the last
24h of commits and issue/PR activity, opening a PR for review
(`dev/procedures/general/auto-lessons.md`); saying "learned lessons" is the on-demand
version of it.
