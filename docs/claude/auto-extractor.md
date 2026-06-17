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
Because every submission that gets past triage + the URL probe spends an agent
run, keep an Anthropic spend cap set (see the secret note below).

You can also trigger it on any existing issue by adding the `extractor-request`
label by hand, as long as the issue body contains an event page URL the agent
can parse.

## Where the pieces live

Almost everything for this pipeline is one self-contained folder,
`tools/new-extractors-creation/`:

- `agent-prompt-extractor.md` — the agent's prompt template (Step 6 fills its
  placeholders).
- `triage-extractor-request.js`, `probe-url.js`, `extractor-naming.js`,
  `scaffold-source.js`, `scaffold-case.js`, `add-supported-domain.js` — the
  deterministic Node steps the workflow runs around the agent.
- `phase1-prepare.sh`, `build-prompt.py`, `phase2-finalize.sh` — the bash/python
  the workflow used to inline. The YAML now just calls them, so it reads as a
  **thin orchestrator**: triggers, permissions, per-step `env:` wiring, and one
  script invocation per step.

Two files **must** live under `.github/` because GitHub pins them there. They
stay put and refer back to the folder:

- `.github/workflows/auto-implement-extractor.yml` — the workflow. Workflows only
  run from `.github/workflows/`; this one calls every script above, so the
  substance lives in the folder and the YAML is just wiring.
- `.github/ISSUE_TEMPLATE/extractor-request.yml` — the issue form. It's a
  declarative template GitHub renders for the "New issue" UI (and the popup opens
  it by filename via `?template=`), so it can't be relocated or factored out.

Shared infrastructure the scripts lean on stays where it's shared, **not** in the
folder: `data/fetch-page.js` (also used by `refresh-cache`), `config.js` /
`fallback-policy.js` (the popup's host classifier), and `tools/index.js`
(`npm run index`, run by every source addition). The pipeline *consumes* these;
it doesn't own them.

## What the workflow does

The workflow is `.github/workflows/auto-implement-extractor.yml`. In order:

1. Checks out the repo.
2. **Triages the request** (`tools/new-extractors-creation/triage-extractor-request.js`): pulls the event
   URL from the issue and decides whether the request is already settled. It
   closes the issue as "not planned" and **skips every remaining step** (no probe,
   no `npm ci`, no agent run) for any of four reasons:
   - **supported** — the host already has a dedicated source, per `config.js`'s
     `supportedDomains` (a static mirror of the sources' own `matches()`, kept
     honest by `test/unit/supported-domains.test.js`);
   - **deny** / **allow** — the host is on the fallback denylist/allowlist (the
     same `classifyHost` the popup uses, via `fallback-policy.js`);
   - **duplicate** — another **open** `extractor-request` issue already targets
     this host (lowest issue number wins; a prior step gathers the open peers
     with `gh` and passes them in, so the script stays offline).

   It also emits the event `url`, `host`, and the deterministic `slug`/`caseName`
   (`tools/new-extractors-creation/extractor-naming.js`) the later steps consume. Runs before `npm ci`, so
   a triaged request costs almost nothing, and fails **open** — any error proceeds.
3. **Probes the event URL** (`tools/new-extractors-creation/probe-url.js`): fetches it the same way the
   recorder will (shared `data/fetch-page.js` — browser headers + retries) and
   decides whether the page is **usable** as a static case. Not usable when: the
   URL is missing; the fetch returns anything but a 2xx (unreachable, login/bot
   wall); **or** it returns a 2xx whose body is actually a bot-challenge /
   interstitial rather than the event page — `probe-url.js`'s `detectChallenge`
   sniffs the body for known vendor markers (AWS WAF, Cloudflare, DataDome,
   PerimeterX, Imperva, reCAPTCHA/hCaptcha) and a suspiciously-small size, the one
   soft-200 block we can catch cheaply before spending the agent (#279 StubHub).
   In every not-usable case there is no real page to record against, so the run
   **stops** — but stopping is an **expected outcome, not a failure**: the probe
   step records its decision in the `proceed` step-output, the downstream steps
   gate on `proceed == 'true'`, and the run ends **green** with a "page not usable"
   comment naming the reason. (A JS-rendered SPA shell that returns a full-but-empty
   page still slips past — it's a real 2xx with no markers — and is caught later by
   the agent's judgment step.) Runs before `npm ci`. Reusing the recorder's exact
   headers is the whole point: a bare `curl` is rejected by sites that serve a real
   browser, which would false-reject requests the recorder could actually fulfil.
4. Installs dependencies + the `claude` CLI and configures git.
5. **Prepares the branch — Phase 1, all deterministic, in the workflow
   (`tools/new-extractors-creation/phase1-prepare.sh`, not the agent):** branches `claude/extractor/<slug>`
   off `main`; records the page inline (`data/<caseName>.url` + the empty `.html`
   signal → `npm run refresh`, asserted non-empty); **scaffolds**
   `pipeline/sources/<slug>.js` with its `matches()` already filled
   (`tools/new-extractors-creation/scaffold-source.js`) **and the placeholder case
   `test/extractors/custom/<caseName>.json`** with empty `events`
   (`tools/new-extractors-creation/scaffold-case.js`); registers the host in `supportedDomains`
   (`tools/new-extractors-creation/add-supported-domain.js`); and runs `npm run index` to regenerate the
   load lists. A baseline `npm run test:offline` must be green before the agent is
   spent; then it commits and pushes. (A `GITHUB_TOKEN` push doesn't fire
   `refresh-cache.yml`'s push trigger, so the page is recorded once.)
6. Interpolates the issue + the branch/slug/caseName/host/url into the prompt
   template (`tools/new-extractors-creation/build-prompt.py`) and runs the agent
   (`claude … --model claude-sonnet-4-6 -p …`) on the prepared branch.
7. **Finalizes — Phase 2, again in the workflow
   (`tools/new-extractors-creation/phase2-finalize.sh`):** enforces the blast radius (below), re-runs
   `test:live` + `test:offline`, commits the agent's two files, opens the PR
   (`Closes #N`), dispatches `test.yml` against the branch, and comments the PR
   link on the issue.

So the agent owns only the judgment step (see `tools/new-extractors-creation/agent-prompt-extractor.md`):
read the real cached page, fill in `extract()` (and the source's header), fill the
pre-created `test/extractors/custom/<caseName>.json` from the actual
`npm run test:live` output, and confirm `test:live` + `test:offline` are green —
then stop. It does **not** create the branch, edit `matches()` / `supportedDomains`
/ the load lists, commit, open the PR, or dispatch CI.

**The agent's write surface is exactly two pre-created files** — the source and the
case. This is a containment guarantee, not just an instruction: Phase 2's
blast-radius guard reverts any *other* tracked change the agent made (e.g. a shared
helper) back to the scaffold commit and deletes anything it created, so a
misbehaving agent can't reach the PR. (If the extractor genuinely depended on a
reverted edit, the re-verify goes red and no PR opens — exactly right.) The prompt
tells the agent to inline any helper logic into its own source IIFE, as
`meetup.js` does, rather than touch `pipeline/helpers/`.

Its one judgment escape hatch: if the cached `data/<caseName>.html` is a
bot/CAPTCHA/login/SPA-shell page rather than the real event page (a soft 2xx the
probe's `detectChallenge` didn't catch — typically a JS-rendered SPA shell), it
**stops**, writes a one-sentence diagnosis to `BAIL_REASON_FILE` (`/tmp`, so the
blast-radius `git clean` can't delete it), and **leaves the case's `events`
empty** — it does **not** comment itself. A filled case is the agent's done-signal:
Phase 2 opens a PR only when `events` is non-empty. A still-empty case means the
agent bailed, so **Phase 2 posts the comment** — quoting the diagnosis file when
present, a generic note otherwise — so an issue the agent actually worked always
gets a reply, and exits **green** (a bail is expected, not a failure). The earlier
design trusted the agent to comment; it didn't reliably (#277), so the comment is
now the workflow's job.

### Why the workflow dispatches CI itself

GitHub deliberately **does not start a workflow run for events triggered by the
built-in `GITHUB_TOKEN`** (this prevents a workflow from recursively triggering
itself). So the Phase-2 `git push` and `gh pr create` do **not** kick off
`test.yml` the way a human push would — the PR would otherwise open with an empty
checks section.

The one documented exception is `workflow_dispatch` (and `repository_dispatch`).
So after opening the PR, Phase 2 dispatches `test.yml` (which has a
`workflow_dispatch:` trigger) against the branch; the run executes against the
branch's head commit, so its checks attach to that commit and appear on the PR for
the reviewer. (The same `GITHUB_TOKEN` rule is what keeps Phase 1's inline
`git push` from re-firing `refresh-cache.yml` — so the page is recorded once.)

## Required secrets

| Secret | Purpose |
|--------|---------|
| `ANTHROPIC_API_KEY_AUTO_IMPLEMENT_EXTRACTOR` | Authenticate the `claude` CLI — **must be set** before this workflow can run |
| `GITHUB_TOKEN` | Standard Actions token — automatically available, no setup needed |

Add `ANTHROPIC_API_KEY_AUTO_IMPLEMENT_EXTRACTOR` under **Settings → Secrets and variables → Actions →
Repository secrets**.

## Permissions the workflow uses

The workflow's `permissions:` block grants the `GITHUB_TOKEN`:
- `contents: write` — push the feature branch (Phase 1 + the agent)
- `pull-requests: write` — open the PR
- `issues: write` — post the progress / failure comment
- `actions: write` — Phase 2 dispatches `test.yml` on the branch

## Timeout

The workflow job times out at 90 minutes. The agent step itself is capped at
75 minutes. Recording the page inline is quick now (it used to be the bulk of the
wait, via the separate refresh workflow), so most of the elapsed time is the
agent.

## Outcomes and comments

Every run that touches an issue leaves exactly one comment. Three of the shapes
are **expected stops that finish green** — not failures — and one is a genuine
failure (red):

- **Page not usable** (green) — the URL probe stopped the run: the event URL was
  missing, returned a non-2xx, sits behind a login/bot wall, or came back as a
  bot-challenge / interstitial (`detectChallenge`). **No agent run was started.**
  The comment names the reason and links the run log. Add the site by hand
  (`docs/claude/adding-a-source.md`).
- **Worked it, no PR** (green) — the agent ran but judged the page unextractable
  (e.g. a JS-rendered SPA shell the probe couldn't see), so it left the case empty.
  Phase 2 posts the agent's diagnosis (or a generic note) and opens no PR. The
  scaffolding stays on the branch for follow-up.
- **PR opened** (green) — the normal success path: Phase 2 commits, opens the PR,
  and comments the link.
- **Unexpected failure** (red) — only a genuine break reaches the `failure()`
  comment now (the expected stops above no longer fail the job). A generic comment
  links the run. Common causes:
  - `ANTHROPIC_API_KEY_AUTO_IMPLEMENT_EXTRACTOR` missing/expired, or its Anthropic
    **spend cap reached** (the `claude` CLI returns a usage-limit error and the
    step fails — this is what stalled the first batch of requests);
  - the agent exhausted its turn budget;
  - the scaffold baseline or the Phase-2 re-verify went red.

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

The prompt template is `tools/new-extractors-creation/agent-prompt-extractor.md`. The placeholders
`{{ISSUE_NUMBER}}`, `{{ISSUE_TITLE}}`, `{{ISSUE_BODY}}`, `{{REPO}}`, `{{BRANCH}}`,
`{{SLUG}}`, `{{CASE_NAME}}`, `{{HOST}}`, and `{{EVENT_URL}}` are substituted at
runtime by the "Build agent prompt" step (`tools/new-extractors-creation/build-prompt.py`; the last
five come from the triage step's outputs). Edit that file to change what the agent
does or add site-specific guidance.
