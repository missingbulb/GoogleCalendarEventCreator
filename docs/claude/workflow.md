# Workflow

For every new task in this repo:

1. Create a GitHub issue describing the task before starting work.
2. Reference that issue number in commit messages (e.g. `Refs #123` or
   `Fixes #123`).
3. Update the issue's status (comments / close) as work progresses and
   when it's done.

When the repo owner says "LGTM" on a change, treat it as approval to merge
that branch's pull request into `main` (the test-flakiness gate in
`docs/engineeringPractices.md` still applies before merging).

When the repo owner says **"bump version"**, treat it as a defined instruction
(like "LGTM"): raise the extension's version by editing the `version` field in
**both** `manifest.json` and `package.json` (they must stay in sync), on a
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
needs the stronger model — and extract any new guidelines or general instructions
worth keeping, then add them to the doc that owns each one. Route by scope:
project mechanics to the matching file under `docs/claude/` (workflow, testing,
adding-a-source, auto-extractor); top-level architecture rules to
`docs/architectureGuidelines.md`; project-agnostic practices to
`docs/engineeringPractices.md`. Keep every addition terse. Project-specific
guidance is good; broader engineering practices that generalize beyond this repo
are better — prefer the most general file a lesson legitimately fits.
