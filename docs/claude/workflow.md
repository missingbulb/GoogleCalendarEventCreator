# Workflow

The GitHub issue → branch → PR → merge lifecycle, the **merge-to-main command**,
and the CI-interaction practices live in [github.md](github.md). The general,
project-agnostic working discipline (confirm-before-building, the warnings
policy) now lives in the shared rules:
[shared/working-discipline.md](shared/working-discipline.md). This file holds the
project-specific working rules, plus the two owner-triggered defined instructions
("bump version", "learned lessons").

Whenever a change regenerates the UI gallery (via `npm run refresh:ui`), link the
branch's copy in the chat in the same turn you commit it — the requirement-first
inline gallery
`https://github.com/<owner>/<repo>/blob/<branch>/docs/uiRequirements.md`, each
requirement with its snapshot beside it — for one-page review.

When a change to a `test/ui/cases/*` case — its spec or its rendering — makes
the snapshot tests **fail** (the pixels moved), don't silently regenerate the
baseline. The owner's approval of the visual diff is the gate; an unreviewed pixel
change is never auto-accepted. The process:

1. **Surface the diff immediately, don't carry on.** Revert the baseline to the
   committed **expected** PNG, run the snapshot test so it fails (the harness
   writes the rendered `actual` and a highlighted `diff` to `test/ui/.artifacts/`),
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

When the repo owner says **"bump version"**, treat it as a defined instruction:
raise the extension's version by editing the `version` field in
**both** `manifest.json` and `package.json` (they must stay in sync), update the `value` in `test/uber/shared_constants/version-sync.json` to match, on a
branch, to be merged into `main` through the normal PR flow. Default to a
**minor** bump (`x.Y.z` → `x.(Y+1).0`); honor an explicit target ("bump version
to 1.4.0") or level ("bump patch" / "bump major") when given. Bumping the
version is the *only* prerequisite to releasing: merging the bump PR to `main`
triggers the **Create Release Package** workflow, which builds and publishes
whatever version is committed in `manifest.json` (and no-ops if that version is
already the latest release). The release workflow never changes the version
itself.

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
unprompted; the owner decides when to do it. Route by scope:

- **Project-specific** lessons land here, in this repo: project mechanics to the
  matching file under `docs/claude/` (workflow, github, testing, adding-a-source,
  auto-extractor); top-level project architecture rules to
  `docs/architectureGuidelines.md`; non-obvious codebase footguns to
  `docs/technicalGotchas.md`.
- **Portable** lessons (general engineering practices, agentic best practices,
  portable git/GitHub procedures, working discipline, agent-architecture
  principles) belong in the **shared rules** — `docs/claude/shared/`, which is the
  **Claudinite** submodule, consumed **read-only** here. They **cannot** be edited
  in this repo (a session can't push across repos), so a portable lesson is
  **handed off to Claudinite**, not written here — see the hand-off mechanism in
  [issue #364](https://github.com/missingbulb/GoogleCalendarEventCreator/issues/364).
  Until that automated hand-off exists, record the portable lesson in the
  Claudinite repo directly (its own session/PR).

Keep every addition terse. Project-specific guidance is good; broader engineering
practices that generalize beyond this repo are better — and a generalizable lesson
belongs in the shared rules (Claudinite), not duplicated here.

A scheduled workflow runs this same pass automatically once a day over the last
24h of commits and issue/PR activity, opening a PR for review
(`docs/claude/auto-lessons.md`); saying "learned lessons" is the on-demand
version of it.
