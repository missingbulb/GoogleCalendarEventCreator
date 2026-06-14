# Engineering practices

General software-engineering practices, independent of this project. (Rules
specific to *this* codebase live in `docs/architectureGuidelines.md`;
project-specific test mechanics live in `docs/claude/testing.md`.)

- Name by scope/responsibility, not technology or mechanism.
- Keep a single source of truth for derived or duplicated data — generate the rest from it instead of hand-editing, and have a test fail if it drifts.
- Verify how a platform or runtime actually behaves against authoritative docs or a real run — not against a comment or a prior commit's claim.
- Earn each dependency: prefer a built-in (or a few lines) for a narrow job, and drop one when the assumption that justified it lapses.
- See a test fail before you trust it: write it red before the fix (green after), or break what it guards and watch it go red. A test that has never failed proves nothing.
- A new test must go green at least twice in CI before merging — one green run doesn't rule out a flake.
- A test that can only run remotely (e.g. CI-only) must diagnose itself: on failure, dump the observed state, not just an assertion.
