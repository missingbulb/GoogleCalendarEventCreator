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

The project's top-level architectural rules of the road live in
`docs/architectureGuidelines.md` (imported below). Whenever we agree on a new or
changed top-level architectural guideline, update that file as part of the same
change.

@docs/architectureGuidelines.md

Non-obvious technical gotchas — codebase footguns that have cost real debugging
time — live in `docs/technicalGotchas.md` (imported below).

@docs/technicalGotchas.md

## Shared portable rules (the Claudinite submodule)

The project-agnostic rules — general software-engineering practices, agentic best
practices, portable git/GitHub procedures, general working discipline,
unattended-agent architecture principles, and the repo owner's personal
interaction preferences — are **not** maintained in this repo. They live in the
shared [`Claudinite`](https://github.com/missingbulb/Claudinite) repo, mounted
here as a git submodule at `docs/claude/shared/` (see its
[README](docs/claude/shared/README.md)) and imported below.

They are consumed **read-only**: a rule change happens in Claudinite and arrives
here as a Dependabot submodule-bump PR, so a portable lesson learned in this repo
is *handed off* to Claudinite rather than edited in place (see
[issue #364](https://github.com/missingbulb/GoogleCalendarEventCreator/issues/364)).
A fresh clone needs `git submodule update --init` (`scripts/cloud-setup.sh` runs
it) or `docs/claude/shared/` is an empty folder and these imports resolve to
nothing.

@docs/claude/shared/engineeringPractices.md
@docs/claude/shared/agenticBestPractices.md
@docs/claude/shared/git-and-github.md
@docs/claude/shared/working-discipline.md
@docs/claude/shared/agent-architecture.md
@docs/claude/shared/ownerPreferences.md
