# Workflow

For every new task in this repo:

1. Create a GitHub issue describing the task before starting work.
2. Reference that issue number in commit messages (e.g. `Refs #123` or
   `Fixes #123`).
3. Update the issue's status (comments / close) as work progresses and
   when it's done.

Confirm a behavior isn't already provided before building a mechanism for it —
verify the gap against a real run first; the cheapest fix is often that it
already works.

Fix build/test/CI warnings, don't tolerate them: a clean run with no warnings
makes a genuinely new warning or error stand out, so noise here costs detection
later. Prefer a small, targeted fix in the same change. When a warning can't be
fixed now without hindering current work (e.g. it's waiting on an upstream
release, or the real fix is a larger refactor), open a dedicated issue for it
(unless one is already open) so it's tracked and not lost — then move on.

Whenever a change regenerates the UI snapshots (`test/ui/cases/*.png`, via
`npm run refresh:ui`), surface them to the reviewer in the same turn you commit
them: show the changed PNGs inline in the chat and link the branch's
`test/ui/README.md` (the rendered gallery of every case —
`https://github.com/<owner>/<repo>/blob/<branch>/test/ui/README.md`) for
one-page review.

When the repo owner says "LGTM" on a change, treat it as approval to merge
that branch's pull request into `main` (the test-flakiness gate in
`docs/engineeringPractices.md` still applies before merging). Merge via
**squash**, appending the PR number to the title as `(#N)` — matching `main`'s
linear, one-commit-per-PR history. After merging, also run **"learned lessons"**
on the conversation before closing out.

When the repo owner says **"bump version"**, treat it as a defined instruction
(like "LGTM"): raise the extension's version by editing the `version` field in
**both** `manifest.json` and `package.json` (they must stay in sync), update the `value` in `test/uber/shared_constants/version-sync.json` to match, on a
branch, to be merged into `main` through the normal PR flow. Default to a
**minor** bump (`x.Y.z` → `x.(Y+1).0`); honor an explicit target ("bump version
to 1.4.0") or level ("bump patch" / "bump major") when given. Bumping the
version is the *only* prerequisite to releasing: merging the bump PR to `main`
triggers the **Create Release Package** workflow, which builds and publishes
whatever version is committed in `manifest.json` (and no-ops if that version is
already the latest release). The release workflow never changes the version
itself.

When the repo owner says **"learned lessons"**, treat it as a defined instruction
(like "LGTM"): review the current conversation — on Opus, since the reflection
needs the stronger model — and extract only the *important*, durable guidelines
worth keeping, then add them to the doc that owns each one. Be selective: the bar
is a genuinely new, reusable insight (a gotcha, practice, architecture rule, or
project mechanic), not a routine detail or a restatement of something already
documented — dedupe against the existing docs. **"No new lessons" is a valid,
common outcome**: if nothing clears the bar, say so and make no edits rather than
padding the docs to look productive. This pass runs only when the repo owner asks
for it — never extract from a conversation unprompted; the owner decides when to
do it. Route by scope: project mechanics to the matching file under
`docs/claude/` (workflow, testing, adding-a-source, auto-extractor); top-level
architecture rules to `docs/architectureGuidelines.md`; non-obvious codebase
footguns to `docs/technicalGotchas.md`; project-agnostic practices to
`docs/engineeringPractices.md`. Keep every addition terse. Project-specific
guidance is good; broader engineering practices that generalize beyond this repo
are better — prefer the most general file a lesson legitimately fits.

A scheduled workflow runs this same pass automatically once a day over the last
24h of commits and issue/PR activity, opening a PR for review
(`docs/claude/auto-lessons.md`); saying "learned lessons" is the on-demand
version of it.
