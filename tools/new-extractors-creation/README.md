# Auto-implement-extractor pipeline

Everything for the workflow that turns an `extractor-request` issue into a PR
adding a new `pipeline/sources/<site>.js` — gathered here so the pipeline reads
as one unit. **Full reference: [`docs/claude/auto-extractor.md`](../../docs/claude/auto-extractor.md).**

## What's in this folder

- **`agent-prompt-extractor.md`** — the agent's prompt template (placeholders
  filled at runtime by `build-prompt.py`).
- Deterministic Node steps the workflow runs around the agent:
  - `triage-extractor-request.js` — close a request already settled (supported /
    listed / duplicate) before spending an agent run.
  - `probe-url.js` — fetch the event URL the way the recorder will; stop on
    anything but a 2xx.
  - `extractor-naming.js` — derive the deterministic `slug` / `caseName` from the
    URL.
  - `scaffold-source.js` — write the `pipeline/sources/<slug>.js` stub (with
    `matches()` filled).
  - `scaffold-case.js` — write the empty placeholder `test/extractors/custom/<caseName>.json`.
  - `add-supported-domain.js` — register the host in `pipeline/fallback-lists.json`.
- The bash/python the workflow used to inline, so its YAML stays a thin
  orchestrator:
  - `phase1-prepare.sh` — branch, record the page, scaffold, baseline-test, push.
  - `build-prompt.py` — fetch the issue + interpolate the prompt template.
  - `phase2-finalize.sh` — blast-radius guard, re-verify, commit, open the PR,
    dispatch CI.

## What lives elsewhere (and why)

GitHub pins two files to `.github/`; they stay there and refer back to this
folder:

- **`.github/workflows/auto-implement-extractor.yml`** — workflows only run from
  `.github/workflows/`. It just wires triggers + env to the scripts above.
- **`.github/ISSUE_TEMPLATE/extractor-request.yml`** — a declarative issue form
  GitHub renders (the popup opens it by filename); it can't be relocated or
  factored out.

Shared infrastructure stays where it's shared — this pipeline consumes it, it
doesn't own it: `data/fetch-page.js` (also used by `refresh-cache`), `config.js` /
`fallback-policy.js` (the popup's host classifier), and `tools/index.js`
(`npm run index`).

The pure functions here are unit-tested from `test/unit/` (`extractor-naming`,
`extractor-scaffold`, `triage-extractor-request`).
