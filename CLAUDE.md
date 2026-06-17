# Maintainer guide

Project conventions and how-tos, split by topic so unrelated changes touch
different files instead of colliding in one monolith. Each section lives in its
own file under `docs/claude/` and is imported here:

@docs/claude/workflow.md
@docs/claude/adding-a-source.md
@docs/claude/testing.md
@docs/claude/merge-conflicts.md
@docs/claude/auto-extractor.md
@docs/claude/auto-lessons.md

The project's top-level architectural rules of the road live in
`docs/architectureGuidelines.md` (imported below). Whenever we agree on a new or
changed top-level architectural guideline, update that file as part of the same
change.

@docs/architectureGuidelines.md

Non-obvious technical gotchas — codebase footguns that have cost real debugging
time — live in `docs/technicalGotchas.md` (imported below).

@docs/technicalGotchas.md

General software-engineering practices that aren't specific to this project
(verifying platform behavior, earning dependencies, test discipline) live in
`docs/engineeringPractices.md` (imported below).

@docs/engineeringPractices.md

Best practices specific to building and running AI agents (as opposed to general
software engineering) live in `docs/agenticBestPractices.md` (imported below).

@docs/agenticBestPractices.md
