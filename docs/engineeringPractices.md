# Engineering practices

General software-engineering practices, independent of this project. (Rules
specific to *this* codebase live in `docs/architectureGuidelines.md`;
project-specific test mechanics live in `docs/claude/testing.md`.)

- Name by scope/responsibility, not technology or mechanism.
- Keep a single source of truth for derived or duplicated data — generate the rest from it instead of hand-editing, and have a test fail if it drifts. When a string literal must appear in files that can't share an import (e.g. a label that spans a YAML workflow guard and a JS module), add a JSON entry to `test/uber/shared_constants/` with the expected occurrence count per file (see that directory for examples).
- Verify how a platform or runtime actually behaves against authoritative docs or a real run — not against a comment or a prior commit's claim.
- Earn each dependency: prefer a built-in (or a few lines) for a narrow job, and drop one when the assumption that justified it lapses.
- See a test fail before you trust it: write it red before the fix (green after), or break what it guards and watch it go red. A test that has never failed proves nothing.
- A new test must go green at least twice in CI before merging — one green run doesn't rule out a flake.
- A test that can only run remotely (e.g. CI-only) must diagnose itself: on failure, dump the observed state, not just an assertion.
- Resilience that swallows errors destroys observability — during development, before a solution is proven right, add debugging information first, and remove it later.
- Don't rewrite published/shared history to satisfy a tooling or authorship check (e.g. a hook flagging "unverified" commits): only amend your own un-pushed branch commits. Commits already on a shared branch — including ones merged in from `main` — belong to that history; reset-authoring or rebasing them forks your branch away from it.
