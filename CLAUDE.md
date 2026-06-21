# Maintainer guide

Project conventions and how-tos, split by topic so unrelated changes touch
different files instead of colliding in one monolith. Each section lives in its
own file under `docs/claude/` and is imported here:

@docs/claude/workflow.md
@docs/claude/github.md
@docs/claude/adding-a-source.md
@docs/claude/testing.md
@docs/claude/auto-extractor.md
@docs/claude/auto-lessons.md
@docs/claude/auto-fallback-coverage.md
@docs/claude/auto-branch-report.md
@docs/claude/claudinite-handoff.md
@docs/claude/auto-optimize-procedures.md

The project's top-level architectural rules of the road live in
`docs/architectureGuidelines.md` (imported below). Whenever we agree on a new or
changed top-level architectural guideline, update that file as part of the same
change.

@docs/architectureGuidelines.md

All requirements-related documents and the tests that validate them live in one
top-level folder, `executable-requirements/`. How requirements are modeled (a
numbered breakdown where every leaf has an external validation case) and how to
add one (with the available case kinds and when to use `tbd`/untested) are
documented in [executable-requirements/README.md](executable-requirements/README.md).

Non-obvious technical gotchas — codebase footguns that have cost real debugging
time — live in `docs/technicalGotchas.md` (imported below).

@docs/technicalGotchas.md

General engineering and agentic practices learned **in this repo** are captured
locally in the working-set docs below (capture is always local — see
`docs/claude/workflow.md`). They start near-empty; the curated canon lives in the
shared submodule (next section), and the `optimize-procedures` routine moves
generalizable items up and prunes them here once the canon absorbs them.

@docs/engineeringPractices.md
@docs/agenticBestPractices.md

## Shared portable rules (the Claudinite submodule)

The project-agnostic **canon** — general software-engineering practices, agentic
best practices, portable git/GitHub procedures, general working discipline,
unattended-agent architecture principles, and the repo owner's personal
interaction preferences — is **not** maintained in this repo. It lives in the
shared [`Claudinite`](https://github.com/missingbulb/Claudinite) repo, mounted
here as a git submodule at `docs/claude/shared/` (see its
[README](docs/claude/shared/README.md)) and imported below.

It is consumed **read-only**: a rule change happens in Claudinite and arrives here
as a Dependabot submodule-bump PR. Lessons are *captured locally* (above) and only
the daily `optimize-procedures` routine bridges them up to Claudinite (see
[issue #364](https://github.com/missingbulb/GoogleCalendarEventCreator/issues/364)
and `docs/claude/auto-optimize-procedures.md`). A fresh clone needs
`git submodule update --init` (`scripts/cloud-setup.sh` runs it) or
`docs/claude/shared/` is an empty folder and these imports resolve to nothing.

@docs/claude/shared/engineeringPractices.md
@docs/claude/shared/agenticBestPractices.md
@docs/claude/shared/git-and-github.md
@docs/claude/shared/working-discipline.md
@docs/claude/shared/agent-architecture.md
@docs/claude/shared/ownerPreferences.md
