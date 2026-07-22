# Maintainer guide

Project conventions and how-tos. The project's own working rules live in its
**Claudinite local pack** under
[`.claudinite/local/packs/`](.claudinite/local/packs/) — tracked project
content, discovered and run by the same Claudinite engine as the shared canon
packs (prose injected at session start, checks at every Stop and in CI, skills
mounted on demand), declared like any pack in
[`.claudinite-checks.json`](.claudinite-checks.json):

- [`gcec`](.claudinite/local/packs/gcec/README.md) — the project's working pack:
  the standing project rules
  ([RULES.md](.claudinite/local/packs/gcec/RULES.md) — working rules, owner
  commands, testing invariants, codebase gotchas, the extractor-pipeline rules,
  the architecture rules of the road, and the capture policy), the project's own
  conformance checks, and the snapshot-approval / merge-and-ci / testing-guide /
  add-live-case skills.

The two unattended routines that grow and improve site support are being converted
into **gcec pack tasks**, run by the per-repo Claudinite scheduler (each task is a
`tasks/<name>/{task.mjs,task.md}` — the declaration + precondition beside the worker
prose, per-project-scheduling §1). The daily auto-fallback-coverage task lives at
[`.claudinite/local/packs/gcec/tasks/auto-fallback-coverage/task.md`](.claudinite/local/packs/gcec/tasks/auto-fallback-coverage/task.md);
the auto-implement-extractor pipeline (an `extractor-request` issue → a PR adding
site support) is still the legacy routine at
[`dev/routines/create-extractor/routine.md`](dev/routines/create-extractor/routine.md)
until its conversion lands. Read a task/routine spec **only** when working on that
pipeline — neither is needed for day-to-day development.

Nothing here `@`-imports the pack's prose: the active packs' RULES.md — canon
and local alike — are injected automatically by the Claudinite SessionStart
hooks, their checks run at every Stop and in CI, and their skills surface when
the activity matches. Lessons learned **in this repo** are captured into the
gcec local pack; the capture policy (route to the right section, prefer a check
over prose, file-local footguns in the file's own header) lives in the gcec
pack's RULES.md. A lesson's *portability* is the Claudinite canon's concern (its
growth routine generalizes local capture into the shared canon), not a reason
to capture it anywhere else.

All requirements-related documents and the tests that validate them live in one
top-level folder, `dev/requirements/`. How requirements are modeled (a
numbered breakdown where every leaf has an external validation case) and how to
add one (with the available case kinds and when to use `tbd`/untested) are
documented in [dev/requirements/README.md](dev/requirements/README.md).

For all release-related actions — building the shippable zip, the
version-bump → release flow, publishing to the Chrome Web Store, and the listing
assets / icon generator — everything is self-contained in
[`dev/build/release/`](dev/build/release/); the shared release procedure lives in the Claudinite chrome-extension-release standard.
Look there **only** when you're actually cutting or publishing a release; it's not
needed for day-to-day development.

The project's design docs live in `dev/procedures/`:
[`highLevelDesign.md`](dev/procedures/highLevelDesign.md) — how extraction
works and where decisions live (the top-level **architecture rules of the
road** moved to the gcec pack's RULES.md; whenever we agree on a new or changed
architectural guideline, update that section as part of the same change) — and
[`fileDescriptions.md`](dev/procedures/fileDescriptions.md), the per-file map.

The product-side research wiki lives under
[`product-wiki/`](product-wiki/README.md) — a self-growing
market/user/competitor/domain corpus, walled off from the code (the Claudinite
**product-wiki** pack's isolation barrier) and grown by that pack's weekly growth
worker. Read it only when working on that wiki; it's not needed for day-to-day
development.

## Shared portable rules (the Claudinite canon)

The project-agnostic **canon** — general software-engineering practices, agentic
best practices, portable git/GitHub procedures, general working discipline,
unattended-agent architecture principles, and the repo owner's personal
interaction preferences — is **not** maintained in this repo. It lives in the
shared [`Claudinite`](https://github.com/missingbulb/Claudinite) repo and is
**vendored** here as tracked files under `.claudinite/shared/` — this repo's
declared vendor set of the canon, refreshed by the fleet's nightly maintenance,
with the snapshot's provenance stamped in
[`.claudinite-checks.json`](.claudinite-checks.json) (`claudinite.updated` /
`claudinite.ref`). A fresh checkout carries the full corpus; nothing is fetched
at session start.

Alongside the vendored canon, [`.claudinite/local/packs/`](.claudinite/local/packs/)
holds this repo's own project packs (project content, not canon — never touched
by the refresh).

The canon is consumed **read-only**; lessons are *captured locally* into the
local packs (above). Reconciling the local packs with the canon is Claudinite's
responsibility, not this repo's; the canon's own updates arrive here with the
nightly refresh.

The owner's personal preferences are **not** read by an instruction here — the
canon's session-start hook injects the current user's preferences into context
automatically, along with the active packs' prose.
