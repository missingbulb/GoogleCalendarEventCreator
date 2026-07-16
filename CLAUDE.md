# Maintainer guide

Project conventions and how-tos, split by topic so unrelated changes touch
different files instead of colliding in one monolith. Each section lives in its
own file under `dev/procedures/` and is imported here:

@dev/procedures/workflow.md
@dev/procedures/github.md
@dev/procedures/testing.md

The project's top-level architectural rules of the road live in the "Architecture
rules of the road" section of
[`dev/procedures/highLevelDesign.md`](dev/procedures/highLevelDesign.md).
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
[`dev/build/release/`](dev/build/release/); the shared release procedure lives in the Claudinite chrome-extension-release standard.
Look there **only** when you're actually cutting or publishing a release; it's not
needed for day-to-day development.

The auto-implement-extractor pipeline (an `extractor-request` issue → a PR adding
site support) is likewise self-contained in
[`dev/routines/create-extractor/`](dev/routines/create-extractor/) (start at
[`dev/routines/create-extractor/routine.md`](dev/routines/create-extractor/routine.md));
the daily routines that incrementally improve the shipped extractor live alongside it
under [`dev/routines/`](dev/routines/) (currently
[`dev/routines/auto-fallback-coverage/`](dev/routines/auto-fallback-coverage/)) — as does
the self-growing product-side wiki's growth routine,
[`dev/routines/product-wiki-growth/`](dev/routines/product-wiki-growth/routine.md) (see
[`product-wiki/README.md`](product-wiki/README.md) for what it maintains). Read any of these
**only** when working on that pipeline/routine — none is needed for day-to-day
development.

Non-obvious technical gotchas — codebase footguns that have cost real debugging
time — live in `dev/procedures/technicalGotchas.md` (imported below).

@dev/procedures/technicalGotchas.md

General engineering, agentic, and other practices learned **in this repo** are
captured locally in the `dev/procedures/` docs imported above, routed
by topic to the doc that owns it (see `workflow.md`) — capture is always local, and
`dev/procedures/` is the whole local capture surface. A lesson's *portability* is the
Claudinite canon's concern (its growth routine generalizes local docs into the
shared canon), not a reason to capture it anywhere else; the curated,
project-agnostic canon lives in the shared Claudinite canon (next section),
maintained upstream and consumed here read-only.

## Shared portable rules (the Claudinite canon)

The project-agnostic **canon** — general software-engineering practices, agentic
best practices, portable git/GitHub procedures, general working discipline,
unattended-agent architecture principles, and the repo owner's personal
interaction preferences — is **not** maintained in this repo. It lives in the
shared [`Claudinite`](https://github.com/missingbulb/Claudinite) repo and is
**mounted read-only** via Claudinite's **Method B**: the
[`.claudinite/sync-claudinite.sh`](.claudinite/sync-claudinite.sh) SessionStart
hook downloads the latest `main` as a codeload tarball over plain HTTPS at the
start of every session, so the canon stays current with no pin to bump. (Why
Method B and not a submodule: in a Claude Code web session the in-session git
remote is a git-only proxy scoped to this repo, so `git submodule update --init`
403s on the separate Claudinite repo and the clone-time gitlink drifts the working
tree — the HTTPS tarball sidesteps both. See
[issue #364](https://github.com/missingbulb/GoogleCalendarEventCreator/issues/364).)

The synced canon is **gitignored**; only a tracked marker file is committed, as a
one-glance signal that this repo mounts Claudinite (the sync hook preserves it
across each refresh). A fresh checkout that hasn't run the hook yet has nothing to
import until the next session start (or running the hook by hand) populates it;
`.claudinite/environment-setup.sh` primes it once per environment. Pin to a specific
commit instead of tracking `main` by setting `CLAUDINITE_REF`.

It is consumed **read-only**; lessons are *captured locally* (above). Reconciling
the local docs with the canon is Claudinite's responsibility, not this repo's; the
canon's own updates arrive here automatically the next time the sync hook pulls
`main`.

The owner's personal preferences are **not** read by an instruction here — a
SessionStart hook (registered after the sync hook, in
[`.claude/settings.json`](.claude/settings.json)) injects the current user's
preferences into context automatically.

The single import line below is the **one place** that records where the canon is
mounted — every other reference reaches it only through this line. We pull in just
the canon's own top-level entry point and let it traverse to the individual canon
docs from there, so the list of shared files lives upstream and never has to be
mirrored here.

@.claudinite/CLAUDE.md
