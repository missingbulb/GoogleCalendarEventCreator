# Automated extractor implementation

New site extractors are implemented automatically when an issue labelled
`extractor-request` is opened. The same pipeline runs in **two modes**, chosen by
triage from whether the host already has a source:

- **new-source mode** — no source matches the host yet: scaffold a brand-new
  `extension/event-extractors/custom/<slug>.js` and fill its `extract()` + case.
- **add-a-case mode** (the host is already **supported**) — instead of closing the
  request, add a fresh integration case for the submitted page to the **existing**
  source, hardening it against a second real page; the agent edits that source only
  if the new page needs a change to extract. The case/branch are keyed by the
  existing source's file name + the issue number (`plan-names.js` → `resolve-source.js`,
  since the file name need not be the slug — `cinema.co.il` is served by
  `telavivcinematheque.js`).

The work runs in **three stages, each fired by a label** — two GitHub Actions
workflows with a Claude Code on the web routine between them:

```
extractor-request      → prepare workflow (auto-implement-extractor.yml)
                           triage + scaffold (records the page), then swaps the label:
                           −extractor-request  +extractor-agent-ready
extractor-agent-ready  → Claude Code web routine (the agent)
                           writes extract() + the case, pushes, then re-labels:
                           success → −extractor-agent-ready +extractor-agent-done
                           bail    → comment + −extractor-agent-ready +extractor-blocked-needs-human
extractor-agent-done   → finalize workflow (finalize-extractor.yml)
                           blast-radius guard + quality floor + re-verify + PR,
                           then clears extractor-agent-done
```

The agent moved **out** of Actions (it used to be a `claude` CLI step) and into a
web routine wired to the `extractor-agent-ready` label, so the API-key/spend-cap
concerns now live with that routine, not in this repo. Everything deterministic —
before the agent (triage, scaffold) and after it (blast-radius, re-verify,
PR) — stays in the two workflows; the agent owns only the judgment step. This
covers the mechanics; what a *correct* extractor looks like lives in
`dev/routines/create-extractor/adding-a-source.md`.

## How to trigger it

Open a new issue using the **Event source request** template
(`.github/ISSUE_TEMPLATE/extractor-request.yml`). It pre-applies the
`extractor-request` label, which starts the prepare workflow immediately. The only
required field is a public URL for a specific event page on the target site; the
other fields (name, time, location, …) are optional context the agent can use to
sanity-check its extraction.

This is the **same form the extension's popup opens** from its "Request support
for this site" button (`extension/events-popup/source-request-view.js`), so an end-user request
flows straight into the pipeline.

You can also trigger it on any existing issue by adding the `extractor-request`
label by hand, as long as the issue body contains an event page URL.

## Where the pieces live

Almost everything for this pipeline is one self-contained folder,
`dev/routines/create-extractor/`:

- `agent-prompt-extractor.md` — the agent's prompt, **self-contained** (no
  build-time interpolation): the web routine points the agent at it, and it tells
  the agent to pick its mode (new-source vs add-a-case) and derive the branch +
  file names from the issue's event URL itself (the same `resolve-source.js` /
  `extractor-naming.js` the workflow used).
- `triage-extractor-request.js`, `attach-sample-url.js`,
  `extractor-naming.js`, `resolve-source.js`, `plan-names.js`, `derive-names.js`,
  `scaffold-source.js`, `scaffold-case.js`, `add-supported-domain.js`,
  `case-quality.js` — the deterministic Node steps the workflows run around the
  agent. `resolve-source.js` (host → existing-source file, via the sources' own
  `matches()`) and `plan-names.js` (the one place that turns a URL + issue number
  into every mode-aware name) are the shared spine that lets triage, the agent, and
  finalize all agree on the mode and file names without passing state around.
- `scraperapi-fetch.sh`, `phase1-prepare.sh`, `handoff-to-agent.sh`,
  `phase2-finalize.sh` — the bash the workflows call, so the YAML reads as a **thin
  orchestrator**: triggers, permissions, per-step `env:` wiring, one script
  invocation per step. `scraperapi-fetch.sh` holds the project's single page fetch
  and all our ScraperAPI-specific handling (`scraperapi_fetch`: tier escalation on
  failure, `.il` geo-targeting, the #279 non-HTML→fail guard, and the #603
  `wait_for_selector`); `phase1-prepare.sh` sources it. It's split out so the fetch
  logic is unit-tested in isolation (`dev/routines/create-extractor/test/scraperapi-fetch.test.js`).

Three files **must** live under `.github/` because GitHub pins them there. They
stay put and refer back to the folder:

- `.github/workflows/auto-implement-extractor.yml` — the **prepare** workflow.
- `.github/workflows/finalize-extractor.yml` — the **finalize** workflow (Phase 2).
- `.github/ISSUE_TEMPLATE/extractor-request.yml` — the issue form GitHub renders
  for the "New issue" UI (the popup opens it by filename via `?template=`), so it
  can't be relocated or factored out.

Shared infrastructure the scripts lean on stays where it's shared, **not** in the
folder: `extension/config.js` / `extension/fallback-policy.js` (the popup's host
classifier), and `dev/build/gen-load-order.js` (`npm run index`, run by every
source addition). The pipeline *consumes* these; it doesn't own them. (Target-page
fetching is no longer a shared module — it's the inline `scraperapi_fetch` curl →
ScraperAPI in `phase1-prepare.sh`, the one place this project fetches a page.)

## Stage 1 — the prepare workflow

`.github/workflows/auto-implement-extractor.yml`, on `extractor-request`. In order:

1. Checks out the repo.
2. **Triages the request** (`triage-extractor-request.js`): pulls the event URL
   from the issue, computes every mode-aware name (`plan-names.js`), and decides
   how to handle it. Two of the dispositions **proceed** (scaffold + agent);
   the other three **close** the issue as "not planned" and skip every remaining
   step. The dispositions:
   - **supported** *(proceeds, add-a-case mode)* — an existing source already
     matches the host (`resolve-source.js`, the sources' own `matches()`). Rather
     than close the request, the pipeline runs in add-a-case mode: it records the
     submitted page and the agent adds a fresh integration case to that existing
     source (and edits it minimally only if the page needs it). `resolve-source`
     supersedes the old static `supportedDomains` check here because it also yields
     the **file** to harden — which the slug can't (`cinema.co.il` →
     `telavivcinematheque.js`). Supported beats the allow/deny/sample checks below;
   - **deny** / **allow** *(close)* — the host is on the fallback denylist/allowlist
     (the same `classifyHost` the popup uses, via `extension/fallback-policy.js`);
   - **sample** — another **open** `extractor-request` issue already targets
     this host (lowest issue number wins; a prior step gathers the open peers with
     `gh` and passes them in, so the script stays offline). The newer request's
     event page isn't discarded: a follow-up step folds it into the **leader**
     issue as an *additional sample page* (the offline, unit-tested
     `attach-sample-url.js` rewrites the leader body's `additional-samples`
     checklist idempotently; the `gh` read/write lives in the workflow). The
     post-reorg agent has a hard two-file write surface, so it can't add the
     extra case itself — the sample accrues on the leader for the maintainer
     reviewing its PR (or a future Phase-1 enhancement) to turn into an
     integration case, which still beats discarding the URL. **In-flight only**:
     once the leader merges the host is `supported`, so later same-host requests
     triage as `supported`.

   It also emits the event `url`, `host`, `mode`, and the deterministic
   `slug`/`sourceBase`/`caseName`/`branch`/`sourcePath` (`plan-names.js`) the later
   steps consume. Runs before `npm ci`, so a triaged request costs almost nothing,
   and fails **open** — any error proceeds.
3. Installs dependencies and configures git. (No pre-flight probe and no
   headless-browser setup any more: ScraperAPI owns bot/CAPTCHA bypass *and* JS
   rendering, so there's nothing to pre-check and no local Chrome to install —
   previously #334, barby #325, visit.tel-aviv #277.)
4. **Prepares the branch — Phase 1, all deterministic (`phase1-prepare.sh`):**
   branches `<branch>` off `main`; records the event page
   (`dev/requirements/extractor/data/server-fetched/<caseName>.url` → `scraperapi_fetch`, a `curl -f`
   through ScraperAPI with `render=true` so a JS single-page-app records real data —
   and, when the request carries a **`Wait-for selector`** the extension derived from
   the live page, `wait_for_selector=<that selector>` so ScraperAPI waits for real
   content to render before snapshotting instead of capturing a shell (#603; triage
   parses the field, the workflow passes it through as `WAIT_SELECTOR`),
   asserted non-empty — an **undownloadable page fails the job here**, and the
   "Comment on failure and hand off to a human" step then drops `extractor-request`
   and adds `extractor-blocked-needs-human`); then, **in
   new-source mode**, scaffolds `extension/event-extractors/custom/<slug>.js` with `matches()` filled
   (`scaffold-source.js`) + the placeholder case (`scaffold-case.js`), registers the
   host in `supportedDomains` (`add-supported-domain.js`), and runs `npm run index`;
   **in add-a-case mode** it scaffolds *only* the placeholder case for the existing
   source (no new source, no `supportedDomains` entry, no load-list change). Either
   way it requires a green baseline `npm run test:offline`, then commits + pushes.
   The commit message starts `chore: scaffold …` — Phase 2 finds the **scaffold
   commit** by that prefix.
5. **Hands off to the agent (`handoff-to-agent.sh`):** posts a human-readable
   status comment, then swaps the label: removes `extractor-request`, adds
   `extractor-agent-ready`. **Adding that label is the trigger for the web
   routine.** No machine-readable hand-off is needed — the agent recomputes its mode
   + branch + file names from the issue's event URL itself (same `resolve-source.js`
   / `plan-names.js` the workflow used). (In supported mode a separate step also
   comments noting which existing source the new case will harden.)

## Stage 2 — the agent (Claude Code on the web)

A web routine wired to the `extractor-agent-ready` label runs the agent against
`agent-prompt-extractor.md`. The agent owns **only the judgment step**: pick its
mode (new-source vs add-a-case, via `resolve-source.js`), check out the branch, read
the real cached page, then either fill in `extract()` (new-source mode) or just add
the case and confirm the existing extractor handles the page (add-a-case mode —
editing the source only minimally, and only if the page needs it), fill the
pre-created case from the actual `npm run test:live` output, and confirm `test:live`
+ `test:offline` are green.

**The agent's write surface is exactly two files** — the source and the case (in
add-a-case mode the source is a *pre-existing* file it may touch only minimally; it
often touches just the case). It commits and pushes *only those two* (it runs in its
own environment now, so it must push for the finalize workflow to see its work),
then re-labels:

- **success** → removes `extractor-agent-ready`, adds `extractor-agent-done` (the
  finalize trigger). It does **not** open the PR.
- **bail** → the cached page isn't **one specific event** (a login page, or a
  listing/index/artist/tour page showing many dates — something the page-download
  step can't judge, since it only confirms the page came back). It
  leaves the case's `events`
  empty, **posts a one-sentence diagnosis comment itself**, removes
  `extractor-agent-ready`, and adds `extractor-blocked-needs-human`. It does **not**
  add `extractor-agent-done`, so finalize never runs.

The two-file surface is a *containment guarantee*, not just an instruction, but the
guarantee is enforced by Stage 3 (the finalize workflow), not the agent — see
below. The prompt tells the agent to inline any helper logic into its own source
IIFE, as `meetup.js` does, rather than touch `extension/event-extractors/helpers/`.

## Stage 3 — the finalize workflow (Phase 2)

`.github/workflows/finalize-extractor.yml`, on `extractor-agent-done`. This is the
**external enforcement** of the agent's containment — it runs in a runner the agent
doesn't control, so the blast-radius guard is a guarantee rather than a request
(`dev/procedures/highLevelDesign.md`). It:

1. **Re-derives the names** (`derive-names.js` → `plan-names.js`) from the issue's
   event URL — the same `mode`/`sourceBase`/`caseName`/`branch`/`host` Phase 1 used,
   from the same code — since the `labeled` event payload carries only the issue,
   not the branch. It runs on the default-branch checkout, so `resolve-source` sees
   `main` and resolves the mode the same way triage did (a new-mode source isn't on
   `main` yet; a supported host's source is).
2. Checks out the agent's branch (`phase2-finalize.sh` does the `git checkout`).
3. **Blast-radius guard:** finds the **scaffold commit** (the Phase-1 commit,
   matched by its message), then diffs the agent's commits against it. Because the
   agent now commits in a separate environment, this is a **commit diff**, not a
   working-tree diff: any file the agent changed *other than* the source + case is
   reverted to the scaffold state (a created file is removed) in a fresh commit, so
   a misbehaving agent can't reach the PR. The allowed source path is mode-aware
   (`sourcePath` from `derive-names`) — in add-a-case mode it's the **existing**
   shipped source, so the agent's permitted minimal edit to it survives while
   everything else is reverted. (If the extractor truly depended on a reverted edit,
   the re-verify below goes red and no PR opens — exactly right.)
4. **Quality floor** (`case-quality.js`): a deterministic backstop to the agent's
   bail judgment. Verdicts: `empty` (case has no events), `degenerate` (a filled
   case whose event has **no location** — the signature of a listing page that
   yielded only a bare title, #283 livenation), or `ok`. A clean bail goes through
   the agent's own Stage-2 path (`extractor-blocked-needs-human`) and never reaches
   here, so `empty`/`degenerate` arriving on `extractor-agent-done` are anomalies:
   Phase 2 **comments, hands the issue to a human** (clears `extractor-agent-done`,
   adds `extractor-blocked-needs-human`), and exits **green** — no PR. Only `ok`
   proceeds.
5. **Re-verifies** (`npm ci` + `test:live` + `test:offline` — don't trust the
   agent), pushes any blast-radius revert, **opens the PR** (`Closes #N`),
   dispatches `test.yml` so checks attach to the branch, comments the PR link, and
   **clears `extractor-agent-done`** (the automation's terminal state).

### Why the finalize workflow dispatches CI itself

GitHub deliberately **does not start a workflow run for events triggered by the
built-in `GITHUB_TOKEN`** (preventing a workflow from recursively triggering
itself). So Phase 2's `git push` and `gh pr create` do **not** kick off `test.yml`
— the PR would open with an empty checks section. The one documented exception is
`workflow_dispatch`, so after opening the PR, Phase 2 dispatches `test.yml`
(which has a `workflow_dispatch:` trigger) against the branch; the run executes on
the branch head, so its checks attach to that commit and appear on the PR.

### Why the label relay works across the boundary

The same `GITHUB_TOKEN` rule is exactly what makes the three-stage relay work:

- The prepare workflow adds `extractor-agent-ready` with the Actions
  `GITHUB_TOKEN`. That suppresses *Actions workflow* runs, but **not** GitHub App
  webhook delivery — so the Claude GitHub App (the web routine) still receives the
  label event and fires.
- The agent adds `extractor-agent-done` with the **App's own token, not
  `GITHUB_TOKEN`**, so it *does* start the finalize workflow.

## Required secrets

| Secret | Purpose |
|--------|---------|
| `GITHUB_TOKEN` | Standard Actions token — automatically available, no setup needed |
| `SCRAPER_API_KEY` | **Optional but recommended.** A [ScraperAPI](https://www.scraperapi.com) key. When set, Phase 1's `scraperapi_fetch` (in `scraperapi-fetch.sh`, sourced by `phase1-prepare.sh` — the single home of our ScraperAPI-specific handling) routes the page download through ScraperAPI's residential proxy with `render=true`, so the datacenter runner isn't bot-blocked (403 / Cloudflare / WAF) and a JS single-page-app records with real data — the IP, not the User-Agent, is what gets blocked. **Retry policy: retry on failure, never on a 200.** A hard site can still defeat the standard proxy pool (ScraperAPI returns 500 / times out), so `scraperapi_fetch` **escalates the proxy tier on a transport failure** — standard → `premium=true` → `ultra_premium=true`, each more capable and more credits than the last — and only fails the job red once the top tier is exhausted (added after seatgeek.com #281 failed on a timeout + three 500s at standard). A **200 is final**: real HTML is kept; a **non-HTML body** (a 2xx whose content carries no markup, i.e. ScraperAPI returned the SPA's *rendered text* with nothing to extract — #279 stubhub, 4018 bytes, not one `<`) is a bad render we **fail on immediately** (no re-fetch, no tier bump — a rendering problem isn't a proxy-quality problem), handing the issue to a human. To get a hydrated SPA in the first place, a request can carry a **`wait_for_selector`** (#603) the extension derived from the user's live page, which `scraperapi_fetch` passes to ScraperAPI so it waits for real content before snapshotting — this replaced the old standard-tier SPA re-fetch loop (#599). `scraperapi_fetch` also **geo-targets `.il` hosts** (`.co.il`/`.gov.il`, etc.) with `country_code=il`, so an Israeli site that geo-gates by IP records from an Israeli residential exit rather than a US one (a foreign IP can be blocked or served wrong-language/region-restricted content — a misleading fixture, worse than a hard failure); other hosts use the default pool. Unset, it fetches directly (the unchanged path) and most non-trivial sites will fail to record from CI. The free tier (1,000 fetches/month, recurring) covers this pipeline's volume. The account's usage/request analytics — handy when investigating a failed or unexpected fetch — are at <https://dashboard.scraperapi.com/analytics>. |

No Anthropic API key is needed in this repo any more: the agent runs in the Claude
Code on the web routine, which carries its own credentials/limits. (The old
`ANTHROPIC_API_KEY_AUTO_IMPLEMENT_EXTRACTOR` secret is no longer read by any
workflow and can be removed.)

## Permissions the workflows use

**prepare** (`auto-implement-extractor.yml`) grants the `GITHUB_TOKEN`:
- `contents: write` — create / push the feature branch
- `issues: write` — post the progress / failure comment, swap labels

**finalize** (`finalize-extractor.yml`) grants:
- `contents: write` — push the blast-radius revert commit
- `pull-requests: write` — open the PR
- `issues: write` — comment + clear the label
- `actions: write` — dispatch `test.yml` on the branch

## Timeouts

The prepare job times out at 90 minutes (recording the page inline is quick, so it
rarely comes close); the finalize job at 30 minutes. The agent's own time budget
lives in the web routine, not here.

## Outcomes and comments

Every run that touches an issue leaves a comment. Most expected stops **finish
green**; the one exception is an undownloadable page, which now fails Phase 1
**red** (ScraperAPI owns the bot/CAPTCHA walls a probe used to flag green, so a
download that still fails is a genuine break).

Both workflows' `failure()` comments carry the **reason** the run broke, not just a
run link: each work step tees its output to `$RUNNER_TEMP/{prepare,finalize}.log`,
and the failure step appends the tail of that log (in a collapsed `<details>`) to
the comment — so the issue itself says, e.g., "push declined: push-protection
secret block" or the failing test, instead of forcing a click into the run. The
captured tail is redacted of the job's secrets (`SCRAPER_API_KEY`, the token)
before posting: the Actions log masks them, but this raw file is posted to a public
issue.

- **Already supported → adds a case** (green, prepare → PR) — the host has a
  dedicated source, so instead of closing, the pipeline runs in **add-a-case mode**:
  it comments which source the request relates to, records the submitted page, and
  the agent adds a fresh integration case (hardening that source), which finalize
  turns into a PR like any other. (A page that turns out not to be one usable event
  still bails via Stage 2 / the quality floor, same as new-source mode.)
- **Page can't be downloaded → red build, handed to a human** (failure, prepare) —
  Phase 1's `scraperapi_fetch` couldn't fetch the page (a missing URL, or ScraperAPI
  couldn't deliver it — non-2xx / network error / timeout), so `curl -f` fails the
  job. No agent involved. Unlike the other stops this one is **red**, but it still
  flags the issue for a person: the "Comment on failure and hand off to a human"
  step posts the failure comment pointing at the manual process
  (`adding-a-source.md`) **and** drops `extractor-request` + adds
  `extractor-blocked-needs-human` — the same human-triage signal the Stage 2 / Stage 3
  stops use, so the issue doesn't sit looking like an unprocessed request. It isn't
  fixable by a plain re-run; retrying means re-adding `extractor-request`.
- **Bailed — not a single event** (green, Stage 2) — the agent judged the cached
  page a login or listing/index page (not one event), commented its diagnosis, and
  set `extractor-blocked-needs-human`. No PR; scaffolding stays on the branch.
- **Anomaly handed to a human** (green, finalize) — `extractor-agent-done` arrived
  but the case is `empty` or `degenerate` (quality floor). Phase 2 comments and
  sets `extractor-blocked-needs-human`. No PR.
- **PR opened** (green, finalize) — the success path: re-verify passes, the PR
  opens, the link is commented, `extractor-agent-done` is cleared.
- **Unexpected failure** (red) — only a genuine break reaches a `failure()`
  comment (in either workflow). Common causes: the scaffold baseline or the
  re-verify went red; `npm ci` / page recording / git or PR work failed. In the
  **prepare** workflow this path also hands the issue to a human
  (`extractor-blocked-needs-human`, dropping `extractor-request`), same as the
  undownloadable-page case above.

In any of these, fall back to the manual process in
`dev/routines/create-extractor/adding-a-source.md`.

## Review gate

The agent never merges the PR. A human must review:
- **new-source mode:** the extractor logic in `extension/event-extractors/custom/<slug>.js`, the
  extracted values in `dev/requirements/extractor/expected/<case-name>.json`, and that
  `matches(host)` is correct for the target domain.
- **add-a-case mode:** the extracted values in the new
  `dev/requirements/extractor/expected/<base>-<issue>.json`, and — if the agent edited the
  existing source — that the diff is a minimal, correct change (no refactor, no
  regression to the other cases the source already covers).

"LGTM" from the repo owner is the merge signal (see `dev/procedures/github.md`). CI
must go green before merging; the extractor branch adds a deterministic offline
integration case (not an e2e/heavy-browser test), so one green run suffices.

## Updating the agent prompt

The prompt is `dev/routines/create-extractor/agent-prompt-extractor.md`. It is
**self-contained** — no placeholders, no build step: the web routine points the
agent at it, and the agent derives the per-issue specifics (mode, branch, source
path, case path, host) from the issue's event URL via `resolve-source.js` +
`extractor-naming.js`, exactly as the prepare workflow did (through `plan-names.js`).
Edit that file to change what the agent does or add site-specific guidance; if the
naming/mode convention in `plan-names.js` / `resolve-source.js` ever changes, the
prompt's Step 0 must follow it.
