# Maintainer guide

Project conventions and how-tos, split by topic so unrelated changes touch
different files instead of colliding in one monolith. Each section lives in its
own file under `dev/procedures/claude/` and is imported here:

@dev/procedures/claude/workflow.md
@dev/procedures/claude/github.md
@dev/procedures/claude/adding-a-source.md
@dev/procedures/claude/testing.md
@dev/procedures/claude/auto-extractor.md
@dev/procedures/claude/auto-lessons.md
@dev/procedures/claude/auto-fallback-coverage.md
@dev/procedures/claude/auto-branch-report.md
@dev/procedures/claude/claudinite-handoff.md
@dev/procedures/claude/auto-optimize-procedures.md

The project's top-level architectural rules of the road live in
`dev/procedures/architectureGuidelines.md` (imported below). Whenever we agree on a new or
changed top-level architectural guideline, update that file as part of the same
change.

@dev/procedures/architectureGuidelines.md

All requirements-related documents and the tests that validate them live in one
top-level folder, `dev/requirements/`. How requirements are modeled (a
numbered breakdown where every leaf has an external validation case) and how to
add one (with the available case kinds and when to use `tbd`/untested) are
documented in [dev/requirements/README.md](dev/requirements/README.md).

Non-obvious technical gotchas — codebase footguns that have cost real debugging
time — live in `dev/procedures/technicalGotchas.md` (imported below).

@dev/procedures/technicalGotchas.md

General engineering and agentic practices learned **in this repo** are captured
locally in the working-set docs below (capture is always local — see
`dev/procedures/claude/workflow.md`). They start near-empty; the curated canon lives in the
shared submodule (next section), and the `optimize-procedures` routine moves
generalizable items up and prunes them here once the canon absorbs them.

@dev/procedures/engineeringPractices.md
@dev/procedures/agenticBestPractices.md

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
and `dev/procedures/claude/auto-optimize-procedures.md`). A fresh clone needs
`git submodule update --init` (`.claude/cloud-setup.sh` runs it) or
`dev/procedures/claude/shared/` is an empty folder and these imports resolve to nothing.

@dev/procedures/claude/shared/engineeringPractices.md
@dev/procedures/claude/shared/agenticBestPractices.md
@dev/procedures/claude/shared/git-and-github.md
@dev/procedures/claude/shared/working-discipline.md
@dev/procedures/claude/shared/agent-architecture.md
@dev/procedures/claude/shared/ownerPreferences.md
