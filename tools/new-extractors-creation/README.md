# Auto-implement-extractor pipeline

Everything for the three-stage flow that turns an `extractor-request` issue into a
PR adding a new `pipeline/sources/<site>.js` — gathered here so the pipeline reads
as one unit. The flow is a label relay: the **prepare** workflow hands off to a
Claude Code on the web routine (the agent) via `extractor-agent-ready`, and the
agent hands off to the **finalize** workflow via `extractor-agent-done`. **Full
reference: [`docs/claude/auto-extractor.md`](../../docs/claude/auto-extractor.md).**

## What's in this folder

- **`agent-prompt-extractor.md`** — the agent's prompt, **self-contained** (no
  build step): the web routine points the agent at it, and it derives the per-issue
  branch/files from the issue's event URL itself (same `extractor-naming.js` the
  workflow used).
- Deterministic Node steps the workflows run around the agent:
  - `triage-extractor-request.js` — close a request already settled (supported /
    listed / sample) before the hand-off.
  - `attach-sample-url.js` — fold a deferred same-host request's event URL into
    the leader issue body as an extra sample (idempotent; the `gh` read/write is
    in the prepare workflow).
  - `probe-url.js` — fetch the event URL the way the recorder will; stop on
    anything but a usable 2xx.
  - `extractor-naming.js` — derive the deterministic `slug` / `caseName` from the
    URL.
  - `derive-names.js` — the finalize workflow's re-derivation of those names from
    the issue (its event payload has no branch).
  - `scaffold-source.js` — write the `pipeline/sources/<slug>.js` stub (with
    `matches()` filled).
  - `scaffold-case.js` — write the empty placeholder `test/extractors/custom/<caseName>.json`.
  - `add-supported-domain.js` — register the host in `pipeline/fallback-lists.json`.
  - `case-quality.js` — the finalize workflow's quality floor (`empty` /
    `degenerate` / `ok`) over the agent's case.
- The bash the workflows call, so the YAML stays a thin orchestrator:
  - `phase1-prepare.sh` — branch, record the page, scaffold, baseline-test, push.
  - `handoff-to-agent.sh` — post a status comment + swap `extractor-request` →
    `extractor-agent-ready` (triggers the agent).
  - `phase2-finalize.sh` — check out the branch, blast-radius guard against the
    scaffold commit, quality floor, re-verify, open the PR, dispatch CI.

## What lives elsewhere (and why)

GitHub pins three files to `.github/`; they stay there and refer back to this
folder:

- **`.github/workflows/auto-implement-extractor.yml`** — the prepare workflow.
- **`.github/workflows/finalize-extractor.yml`** — the finalize workflow (Phase 2).
- **`.github/ISSUE_TEMPLATE/extractor-request.yml`** — a declarative issue form
  GitHub renders (the popup opens it by filename); it can't be relocated or
  factored out.

Shared infrastructure stays where it's shared — this pipeline consumes it, it
doesn't own it: `data/fetch-page.js` (also used by `refresh-cache`), `config.js` /
`fallback-policy.js` (the popup's host classifier), and `tools/index.js`
(`npm run index`).

The pure functions here are unit-tested from `test/unit/` (`extractor-naming`,
`extractor-scaffold`, `triage-extractor-request`).
