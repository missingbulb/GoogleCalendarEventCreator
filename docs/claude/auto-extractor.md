# Automated extractor implementation

A GitHub Actions workflow automatically implements new site extractors when an
issue labelled `extractor-request` is opened. This covers the mechanics; the
project conventions for what a correct extractor looks like live in
`docs/claude/adding-a-source.md`.

## How to trigger it

Open a new issue using the **Event source request** template
(`.github/ISSUE_TEMPLATE/extractor-request.yml`). It pre-applies the
`extractor-request` label, which starts the workflow immediately. The only
required field is a public URL for a specific event page on the target site;
the other fields (name, time, location, …) are optional context the agent can
use to sanity-check its extraction.

This is the **same form the extension's popup opens** from its "Request support
for this site" button (`ui/views/source-request-view.js`), so an end-user
request flows straight into the pipeline — submitting it is what fires the agent.
Because every submission spends an Opus run, keep an Anthropic spend cap set (see
the secret note below).

You can also trigger it on any existing issue by adding the `extractor-request`
label by hand, as long as the issue body contains an event page URL the agent
can parse.

## What the workflow does

The workflow is `.github/workflows/auto-implement-extractor.yml`. It:

1. Checks out the repo.
2. **Triages the request first** (`tools/triage-extractor-request.js`): pulls the
   event URL from the issue and decides whether the request is already settled.
   It closes the issue as "not planned" and **skips every remaining step** (no
   `npm ci`, no agent run) for any of four reasons:
   - **supported** — the host already has a dedicated source, per
     `config.js`'s `supportedDomains` (a static mirror of the sources' own
     `matches()`, kept honest by `test/unit/supported-domains.test.js`);
   - **deny** / **allow** — the host is on the fallback denylist/allowlist (the
     same `classifyHost` the popup uses, via `fallback-policy.js`);
   - **duplicate** — another **open** `extractor-request` issue already targets
     this host. A request's issue stays open through review (the PR only
     `Closes #N` on merge), so an open peer means the work is in flight; a
     prior step gathers those peers with `gh` and passes them in (so the script
     stays offline). Two near-simultaneous requests are broken by **lowest
     issue number wins** — the elder proceeds, the rest defer to it.

   This runs before `npm ci` so a triaged request costs almost nothing. It fails
   open: any error (or no match) proceeds to the agent.
3. Otherwise installs dependencies, fetches the issue, and interpolates it into
   the agent prompt template (`.github/agent-prompt-extractor.md`).
4. Runs a Claude agent (`claude --dangerously-skip-permissions -p ...`) with
   full Bash access.

The agent itself does everything described in `docs/claude/adding-a-source.md`
in two phases, handling the HTML-cache step automatically:

**Phase 1** (before the HTML is fetched)
- Creates branch `claude/extractor/<site-slug>`
- Writes `pipeline/sources/<slug>.js` using `pipeline/sources/meetup.js` as the template
- Runs `npm run index` to regenerate both load lists (`pipeline/load-order.generated.json` and `pipeline/worker-imports.generated.js`; the service worker's imports are generated, not hand-edited)
- Commits two placeholder files (`data/<case-name>.html` (empty) + `data/<case-name>.url`)
- Pushes the branch, then triggers the **Refresh cached HTML files** workflow via the GitHub API

**Phase 2** (after the HTML is fetched)
- Polls the GitHub API until the refresh workflow completes
- Pulls the filled HTML file
- Creates `test/extractors/custom/<case-name>.json` with a placeholder `expected`
- Runs `npm run test:live` to capture the actual extraction output
- Updates the case with real expected values and confirms the tests pass
- Runs `npm run test:offline` to catch regressions
- Opens a pull request referencing the issue
- Dispatches the `Tests` workflow against the branch so CI actually runs (see
  note below)
- Posts a comment on the issue with the PR link

### Why the agent has to dispatch CI itself

GitHub deliberately **does not start a workflow run for events triggered by the
built-in `GITHUB_TOKEN`** (this prevents a workflow from recursively triggering
itself). So the agent's `git push` (a `push` event) and `gh pr create` (a
`pull_request` event) do **not** kick off `test.yml` the way a human push would
— the PR would otherwise open with an empty checks section.

The one documented exception is `workflow_dispatch` (and `repository_dispatch`).
That is why two things in this pipeline use the Actions dispatch API rather than
relying on the push/PR triggers:

1. The Phase 1 → Phase 2 handoff dispatches `refresh-cache.yml`.
2. After opening the PR, the agent dispatches `test.yml` (which has a
   `workflow_dispatch:` trigger) against its branch. The run executes against
   the branch's head commit, so its check results attach to that commit and
   appear on the PR for the reviewer.

## Required secrets

| Secret | Purpose |
|--------|---------|
| `ANTHROPIC_API_KEY_AUTO_IMPLEMENT_EXTRACTOR` | Authenticate the `claude` CLI — **must be set** before this workflow can run |
| `GITHUB_TOKEN` | Standard Actions token — automatically available, no setup needed |

Add `ANTHROPIC_API_KEY_AUTO_IMPLEMENT_EXTRACTOR` under **Settings → Secrets and variables → Actions →
Repository secrets**.

## Permissions the workflow uses

The workflow's `permissions:` block grants the `GITHUB_TOKEN`:
- `contents: write` — push the feature branch
- `pull-requests: write` — open the PR
- `issues: write` — post the completion comment
- `actions: write` — trigger the `workflow_dispatch` on `refresh-cache.yml`

## Timeout

The workflow job times out at 90 minutes. The agent step itself is capped at
75 minutes. Most runs finish in 20–40 minutes (the bulk is waiting for the
refresh-cache workflow to fetch and commit the HTML).

## On failure

If the agent step fails, the workflow posts a comment on the issue with a link
to the failed run so a maintainer can investigate. Common causes:

- `ANTHROPIC_API_KEY_AUTO_IMPLEMENT_EXTRACTOR` secret is missing or expired
- The event URL in the issue is behind a login wall or returns 403/404
- The `refresh-cache` workflow itself fails (e.g., the site blocks the fetcher)
- The agent exhausted its turn budget before completing

In any of these cases, fall back to the manual process in
`docs/claude/adding-a-source.md`.

## Review gate

The agent never merges the PR. A human must review:
- The extractor logic in `pipeline/sources/<slug>.js`
- The extracted values in `test/extractors/custom/<case-name>.json`
- That `matches(host)` is correct for the target domain

"LGTM" from the repo owner is the merge signal (see `docs/claude/workflow.md`).
CI must go green at least twice before merging a branch that adds new tests.

## Updating the agent prompt

The prompt template is `.github/agent-prompt-extractor.md`. The placeholders
`{{ISSUE_NUMBER}}`, `{{ISSUE_TITLE}}`, `{{ISSUE_BODY}}`, and `{{REPO}}` are
substituted at runtime by the "Build agent prompt" step. Edit that file to
change what the agent does or add site-specific guidance.
