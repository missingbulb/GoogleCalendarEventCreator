# Workflow

The GitHub issue → branch → PR → merge lifecycle, the **merge-to-main command**,
and the CI-interaction practices live in [github.md](github.md). This file holds
the working discipline that isn't itself a GitHub operation, plus the two
owner-triggered defined instructions ("bump version", "learned lessons").

Confirm a behavior isn't already provided before building a mechanism for it —
verify the gap against a real run first; the cheapest fix is often that it
already works.

Fix build/test/CI warnings, don't tolerate them: a clean run with no warnings
makes a genuinely new warning or error stand out, so noise here costs detection
later. Prefer a small, targeted fix that addresses the *cause* in the same
change.

Suppressing a warning — muting it with a flag (e.g. `--disable-warning`),
`eslint-disable`, swallowing it, etc. — is **not** a small fix: it hides the
signal instead of resolving it. Never reach for suppression as the quick path.
It's only ever an option inside the dedicated-issue path below, as a deliberate,
reviewed decision once the real fix has been weighed and rejected — never an
unattended default.

When a warning can't be fixed with a small cause-addressing change now without
hindering current work (e.g. it's waiting on an upstream release, or the real
fix is a larger refactor), open a dedicated issue for it (unless one is already
open) so it's tracked and not lost — then move on. Resolving it (real fix, or a
consciously-chosen suppression) happens in that issue's own change.

Whenever a change regenerates the UI snapshots (`test/ui/cases/*.png`, via
`npm run refresh:ui`), surface them to the reviewer in the same turn you commit
them: show the changed PNGs inline in the chat and link the branch's
`test/ui/README.md` (the rendered gallery of every case —
`https://github.com/<owner>/<repo>/blob/<branch>/test/ui/README.md`) for
one-page review.

When a change to a `test/ui/cases/*` case — its spec or its rendering — makes
the snapshot tests **fail** (the pixels moved), don't silently regenerate the
baseline: show the **expected** (committed) and **actual** (newly-rendered) PNGs
inline in the chat side by side and **ask the owner to approve the difference**
before refreshing and committing the new snapshot. The owner's approval of the
visual diff is the gate; an unreviewed pixel change is never auto-accepted.

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
unprompted; the owner decides when to do it. Route by scope: project mechanics to
the matching file under
`docs/claude/` (workflow, github, testing, adding-a-source, auto-extractor); top-level
architecture rules to `docs/architectureGuidelines.md`; non-obvious codebase
footguns to `docs/technicalGotchas.md`; AI-agent-specific best practices to
`docs/agenticBestPractices.md`; other project-agnostic practices to
`docs/engineeringPractices.md`. Keep every addition terse. Project-specific
guidance is good; broader engineering practices that generalize beyond this repo
are better — prefer the most general file a lesson legitimately fits.

A scheduled workflow runs this same pass automatically once a day over the last
24h of commits and issue/PR activity, opening a PR for review
(`docs/claude/auto-lessons.md`); saying "learned lessons" is the on-demand
version of it.
