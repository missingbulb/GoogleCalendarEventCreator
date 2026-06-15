# Engineering practices

General software-engineering practices, independent of this project. (Rules
specific to *this* codebase live in `docs/architectureGuidelines.md`;
project-specific test mechanics live in `docs/claude/testing.md`.)

- Name by scope/responsibility, not technology or mechanism.
- Keep a single source of truth for derived or duplicated data — generate the rest from it instead of hand-editing, and have a test fail if it drifts. When a string literal must appear in files that can't share an import (e.g. a label that spans a YAML workflow guard and a JS module), add a JSON entry to `test/uber/shared_constants/` with the expected occurrence count per file (see that directory for examples).
- Verify how a platform or runtime actually behaves against authoritative docs or a real run — not against a comment or a prior commit's claim.
- A green run in your dev sandbox isn't a green run in the target environment — working directory, user, and PATH can differ; verify where the code will actually execute, or reproduce that context.
- Earn each dependency: prefer a built-in (or a few lines) for a narrow job, and drop one when the assumption that justified it lapses.
- Earn a place in always-loaded context — keep global instruction files and their imports lean; documentation only some tasks need belongs co-located with its subject (a script's own comments, the relevant module) or its tracking issue, not the always-read guide.
- See a test fail before you trust it: write it red before the fix (green after), or break what it guards and watch it go red. A test that has never failed proves nothing.
- A new test must go green at least twice in CI before merging — one green run doesn't rule out a flake.
- A test that can only run remotely (e.g. CI-only) must diagnose itself: on failure, dump the observed state, not just an assertion.
- Resilience that swallows errors destroys observability — a step kept from blocking with `|| true`, a catch-all, or a silent fallback can fail invisibly, so record its outcome or assert the post-condition rather than reading "no error" as success.
