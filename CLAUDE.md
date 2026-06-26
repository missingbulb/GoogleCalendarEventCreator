# Maintainer guide

Project conventions and how-tos, split by topic so unrelated changes touch
different files instead of colliding in one monolith. Each section lives in its
own file under `dev/procedures/` and is imported here:

@dev/procedures/this_project/workflow.md
@dev/procedures/this_project/github.md
@dev/procedures/this_project/testing.md
@dev/procedures/general/auto-lessons.md
@dev/procedures/general/auto-branch-report.md
@dev/procedures/general/claudinite-handoff.md
@dev/procedures/general/auto-optimize-procedures.md
@dev/procedures/general/textAndFileManipulation.md

The project's top-level architectural rules of the road live in the "Architecture
rules of the road" section of
[`dev/procedures/this_project/highLevelDesign.md`](dev/procedures/this_project/highLevelDesign.md).
Whenever we agree on a new or changed top-level architectural guideline, update
that section as part of the same change.

All requirements-related documents and the tests that validate them live in one
top-level folder, `dev/requirements/`. How requirements are modeled (a
numbered breakdown where every leaf has an external validation case) and how to
add one (with the available case kinds and when to use `tbd`/untested) are
documented in [dev/requirements/README.md](dev/requirements/README.md).

For all release-related actions — building the shippable zip, the
version-bump → release flow, publishing to the Chrome Web Store, and the listing
assets / icon generator — everything is self-contained in
[`dev/build/release/`](dev/build/release/) (start at [`dev/build/release/releasing.md`](dev/build/release/releasing.md)).
Look there **only** when you're actually cutting or publishing a release; it's not
needed for day-to-day development.

The auto-implement-extractor pipeline (an `extractor-request` issue → a PR adding
site support) is likewise self-contained in
[`dev/create-extractor/`](dev/create-extractor/) (start at
[`dev/create-extractor/auto-extractor.md`](dev/create-extractor/auto-extractor.md));
the daily routines that incrementally improve the shipped extractor live in
[`dev/incremental-maintenance/`](dev/incremental-maintenance/). Read either **only**
when working on that pipeline/routine — neither is needed for day-to-day development.

Non-obvious technical gotchas — codebase footguns that have cost real debugging
time — live in `dev/procedures/this_project/technicalGotchas.md` (imported below).

@dev/procedures/this_project/technicalGotchas.md

General engineering and agentic practices learned **in this repo** are captured
locally in the working-set docs below (capture is always local — see
`dev/procedures/this_project/workflow.md`). They start near-empty; the curated canon lives in the
shared submodule (next section), and the `optimize-procedures` routine moves
generalizable items up and prunes them here once the canon absorbs them. The
portable-by-topic working-set docs under `dev/procedures/general/` (git/GitHub and
working-discipline gotchas already generalized, awaiting promotion) are part of the
same local capture surface.

@dev/procedures/general/engineeringPractices.md
@dev/procedures/general/agenticBestPractices.md
@dev/procedures/general/git-and-github.md
@dev/procedures/general/working-discipline.md
@dev/procedures/general/testingPractices.md
@dev/procedures/general/filePlacement.md

## Shared portable rules (the Claudinite submodule)

The project-agnostic **canon** — general software-engineering practices, agentic
best practices, portable git/GitHub procedures, general working discipline,
unattended-agent architecture principles, and the repo owner's personal
interaction preferences — is **not** maintained in this repo. It lives in the
shared [`Claudinite`](https://github.com/missingbulb/Claudinite) repo, mounted
here as a git submodule at `dev/procedures/claude/shared/` (see its
[README](dev/procedures/claude/shared/README.md)) and imported below.

It is consumed **read-only**: a rule change happens in Claudinite and arrives here
as a Dependabot submodule-bump PR. Lessons are *captured locally* (above) and only
the daily `optimize-procedures` routine bridges them up to Claudinite (see
[issue #364](https://github.com/missingbulb/GoogleCalendarEventCreator/issues/364)
and `dev/procedures/general/auto-optimize-procedures.md`). A fresh clone needs
`git submodule update --init` (`.claude/cloud-setup.sh` runs it) or
`dev/procedures/claude/shared/` is an empty folder and this import resolves to nothing.

We import only the submodule's own top-level `CLAUDE.md` — the single entry point
Claudinite maintains — and let it traverse to the individual canon docs from there,
so the list of shared files lives upstream and never has to be mirrored here.

@dev/procedures/claude/shared/CLAUDE.md
