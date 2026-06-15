# Engineering practices

General software-engineering practices, independent of this project. (Rules
specific to *this* codebase live in `docs/architectureGuidelines.md`;
project-specific test mechanics live in `docs/claude/testing.md`.)

- Name by scope/responsibility, not technology or mechanism.
- Keep a single source of truth for derived or duplicated data — generate the rest from it instead of hand-editing, and have a test fail if it drifts. When a string literal must appear in files that can't share an import (e.g. a label that spans a YAML workflow guard and a JS module), add a JSON entry to `test/uber/shared_constants/` with the expected occurrence count per file (see that directory for examples).
- Verify how a platform or runtime actually behaves against authoritative docs or a real run — not against a comment or a prior commit's claim.
- When a bug recurs after a "fix", suspect the diagnosis, not just the code — re-derive the cause from observation rather than iterating on the prior theory. Weight the repo's own shipped-working behavior over external or general claims (web search, blogs) when they conflict: prior working code is a real run; a stale external claim isn't.
- When you can't exercise the platform yourself, get one real datapoint from a minimal probe (have whoever can, run it) before committing to — or broadcasting — a root cause. Don't ship, or announce, a theory you could cheaply observe.
- Earn each dependency: prefer a built-in (or a few lines) for a narrow job, and drop one when the assumption that justified it lapses.
- See a test fail before you trust it: write it red before the fix (green after), or break what it guards and watch it go red. A test that has never failed proves nothing.
- A test that stubs the exact boundary where the bug lives can't catch that bug — it guards only the shape it asserts, not the runtime effect. Say what it can't catch.
- Code that can be loaded into the same context more than once (injected scripts, re-imported modules) must reset or replace shared state at load, not append to it — and a load-twice test should guard it.
- A new test must go green at least twice in CI before merging — one green run doesn't rule out a flake.
- A test that can only run remotely (e.g. CI-only) must diagnose itself: on failure, dump the observed state, not just an assertion.
- Resilience that swallows errors destroys observability — during development, before a solution is proven right, add debugging information first, and remove it later.
