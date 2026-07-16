# Maintainer guide

Project conventions and how-tos. The project's own working rules live in its
**Claudinite local pack** under
[`.claudinite/local_packs/`](.claudinite/local_packs/) — tracked project
content, discovered and run by the same Claudinite engine as the shared canon
packs (prose injected at session start, checks at every Stop and in CI, skills
mounted on demand), declared like any pack in
[`.claudinite-checks.json`](.claudinite-checks.json):

- [`gcec`](.claudinite/local_packs/gcec/README.md) — the project's working pack:
  the standing project rules
  ([RULES.md](.claudinite/local_packs/gcec/RULES.md) — working rules, owner
  commands, testing invariants, codebase gotchas, the extractor-pipeline rules,
  the architecture rules of the road, and the capture policy), the project's own
  conformance checks, and the snapshot-approval / merge-and-ci / testing-guide /
  add-live-case skills.

The two unattended routines that grow and improve site support — the
auto-implement-extractor pipeline (an `extractor-request` issue → a PR adding
site support) and the daily auto-fallback-coverage routine — live under
[`dev/routines/`](dev/routines/) (start at
[`dev/routines/create-extractor/routine.md`](dev/routines/create-extractor/routine.md) or
[`dev/routines/auto-fallback-coverage/routine.md`](dev/routines/auto-fallback-coverage/routine.md)),
scheduled outside this repo. Read a routine spec **only** when working on that
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

## Shared portable rules (the Claudinite canon)

The project-agnostic **canon** — general software-engineering practices, agentic
best practices, portable git/GitHub procedures, general working discipline,
unattended-agent architecture principles, and the repo owner's personal
interaction preferences — is **not** maintained in this repo. It lives in the
shared [`Claudinite`](https://github.com/missingbulb/Claudinite) repo and is
**mounted read-only** via Claudinite's **Method B**: the
[`.claudinite/mount/sync-claudinite.sh`](.claudinite/mount/sync-claudinite.sh) SessionStart
hook downloads the latest `main` as a codeload tarball over plain HTTPS at the
start of every session, so the canon stays current with no pin to bump. (Why
Method B and not a submodule: in a Claude Code web session the in-session git
remote is a git-only proxy scoped to this repo, so `git submodule update --init`
403s on the separate Claudinite repo and the clone-time gitlink drifts the working
tree — the HTTPS tarball sidesteps both. See
[issue #364](https://github.com/missingbulb/GoogleCalendarEventCreator/issues/364).)

The synced canon is **gitignored**; the tracked exceptions are the sync hook
itself (the one-glance signal that this repo mounts Claudinite, preserved by
the hook across each refresh) and this repo's own
[`.claudinite/local_packs/`](.claudinite/local_packs/) (project content, not
canon — likewise preserved across the sync's directory swap). A fresh checkout
that hasn't run the hook yet has nothing to import until the next session start
(or running the hook by hand) populates the mount;
`.claudinite/mount/environment-setup.sh` primes it once per environment. Pin to
a specific commit instead of tracking `main` by setting `CLAUDINITE_REF`.

The canon is consumed **read-only**; lessons are *captured locally* into the
local packs (above). Reconciling the local packs with the canon is Claudinite's
responsibility, not this repo's; the canon's own updates arrive here
automatically the next time the sync hook pulls `main`.

The owner's personal preferences are **not** read by an instruction here — the
sync hook's session-start fan-out injects the current user's preferences into
context automatically.

The single import line below is the **one place** that records where the canon is
mounted — every other reference reaches it only through this line. We pull in just
the canon's own top-level entry point and let it traverse to the individual canon
docs from there, so the list of shared files lives upstream and never has to be
mirrored here.

@.claudinite/CLAUDE.md
