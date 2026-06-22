# Auto-implement-extractor pipeline

Everything for the three-stage flow that turns an `extractor-request` issue into a
PR — gathered here so the pipeline reads as one unit. It runs in **two modes**: a
new host gets a brand-new `extension/pipeline/sources/<site>.js` (**new-source mode**); an
already-supported host instead gets a fresh integration case added to its existing
source (**add-a-case mode**), hardening it against a second real page. The flow is a
label relay: the **prepare** workflow hands off to a Claude Code on the web routine
(the agent) via `extractor-agent-ready`, and the agent hands off to the **finalize**
workflow via `extractor-agent-done`. **Full reference:
[`dev/procedures/claude/auto-extractor.md`](../../procedures/claude/auto-extractor.md).**

## What's in this folder

- **`agent-prompt-extractor.md`** — the agent's prompt, **self-contained** (no
  build step): the web routine points the agent at it, and it picks its mode and
  derives the per-issue branch/files from the issue's event URL itself (same
  `resolve-source.js` / `extractor-naming.js` the workflow used).
- Deterministic Node steps the workflows run around the agent:
  - `triage-extractor-request.js` — decide how to handle a request: **supported**
    proceeds in add-a-case mode, **deny/allow/sample** close it, anything else
    proceeds in new-source mode.
  - `resolve-source.js` — host → the **existing** source file that handles it, via
    the sources' own `matches()` (the file name need not be the slug). The authority
    for "is this host supported" and, in add-a-case mode, which file to harden.
  - `plan-names.js` — the single place that turns a URL + issue number into every
    mode-aware name (`mode`, `sourceBase`, `caseName`, `branch`, `sourcePath`, …);
    shared by triage and `derive-names` so they can't drift.
  - `attach-sample-url.js` — fold a deferred same-host request's event URL into
    the leader issue body as an extra sample (idempotent; the `gh` read/write is
    in the prepare workflow).
  - `probe-url.js` — fetch the event URL the way the recorder will; stop on
    anything but a usable 2xx.
  - `extractor-naming.js` — derive the deterministic `slug` / `caseName` / matches
    regex from the URL (used by `plan-names.js`).
  - `derive-names.js` — the finalize workflow's re-derivation of those mode-aware
    names from the issue (its event payload has no branch), via `plan-names.js`.
  - `scaffold-source.js` — write the `extension/pipeline/sources/<slug>.js` stub (with
    `matches()` filled). New-source mode only.
  - `scaffold-case.js` — write the empty placeholder `dev/requirements/extractors/custom/<caseName>.json`.
  - `add-supported-domain.js` — register the host in `extension/pipeline/fallback-lists.json`.
    New-source mode only.
  - `case-quality.js` — the finalize workflow's quality floor (`empty` /
    `degenerate` / `ok`) over the agent's case.
- The bash the workflows call, so the YAML stays a thin orchestrator:
  - `phase1-prepare.sh` — branch, record the page, scaffold (a new source + case in
    new-source mode, or just a case in add-a-case mode), baseline-test, push.
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
doesn't own it: `dev/requirements/infra/data/fetch-page.js` (also used by `refresh-cache`), `extension/config.js` /
`extension/fallback-policy.js` (the popup's host classifier), and `dev/tools/gen-load-order.js`
(`npm run index`).

The pure functions here are unit-tested from `dev/tools/test/` (`extractor-naming`,
`resolve-source`, `extractor-scaffold`, `triage-extractor-request`,
`attach-sample-url`).
