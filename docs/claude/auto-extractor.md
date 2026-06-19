# Automated extractor implementation

New site extractors are implemented automatically when an issue labelled
`extractor-request` is opened. The work runs in **three stages, each fired by a
label** — two GitHub Actions workflows with a Claude Code on the web routine
between them:

```
extractor-request      → prepare workflow (auto-implement-extractor.yml)
                           triage + probe + scaffold, then swaps the label:
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
before the agent (triage, probe, scaffold) and after it (blast-radius, re-verify,
PR) — stays in the two workflows; the agent owns only the judgment step. This
covers the mechanics; what a *correct* extractor looks like lives in
`docs/claude/adding-a-source.md`.

## How to trigger it

Open a new issue using the **Event source request** template
(`.github/ISSUE_TEMPLATE/extractor-request.yml`). It pre-applies the
`extractor-request` label, which starts the prepare workflow immediately. The only
required field is a public URL for a specific event page on the target site; the
other fields (name, time, location, …) are optional context the agent can use to
sanity-check its extraction.

This is the **same form the extension's popup opens** from its "Request support
for this site" button (`ui/views/source-request-view.js`), so an end-user request
flows straight into the pipeline.

You can also trigger it on any existing issue by adding the `extractor-request`
label by hand, as long as the issue body contains an event page URL.

## Where the pieces live

Almost everything for this pipeline is one self-contained folder,
`tools/new-extractors-creation/`:

- `agent-prompt-extractor.md` — the agent's prompt, **self-contained** (no
  build-time interpolation): the web routine points the agent at it, and it tells
  the agent to derive the branch + file names from the issue's event URL itself
  (the same `extractor-naming.js` the workflow used).
- `triage-extractor-request.js`, `probe-url.js`, `extractor-naming.js`,
  `derive-names.js`, `scaffold-source.js`, `scaffold-case.js`,
  `add-supported-domain.js`, `case-quality.js` — the deterministic Node steps the
  workflows run around the agent.
- `phase1-prepare.sh`, `handoff-to-agent.sh`, `phase2-finalize.sh` — the bash the
  workflows call, so the YAML reads as a **thin orchestrator**: triggers,
  permissions, per-step `env:` wiring, one script invocation per step.

Three files **must** live under `.github/` because GitHub pins them there. They
stay put and refer back to the folder:

- `.github/workflows/auto-implement-extractor.yml` — the **prepare** workflow.
- `.github/workflows/finalize-extractor.yml` — the **finalize** workflow (Phase 2).
- `.github/ISSUE_TEMPLATE/extractor-request.yml` — the issue form GitHub renders
  for the "New issue" UI (the popup opens it by filename via `?template=`), so it
  can't be relocated or factored out.

Shared infrastructure the scripts lean on stays where it's shared, **not** in the
folder: `data/fetch-page.js` (also used by `refresh-cache`), `config.js` /
`fallback-policy.js` (the popup's host classifier), and `tools/index.js`
(`npm run index`, run by every source addition). The pipeline *consumes* these; it
doesn't own them.

## Stage 1 — the prepare workflow

`.github/workflows/auto-implement-extractor.yml`, on `extractor-request`. In order:

1. Checks out the repo.
2. **Triages the request** (`triage-extractor-request.js`): pulls the event URL
   from the issue and decides whether the request is already settled. It closes
   the issue as "not planned" and **skips every remaining step** (no probe, no
   `npm ci`, no hand-off) for any of four reasons:
   - **supported** — the host already has a dedicated source, per `config.js`'s
     `supportedDomains` (a static mirror of the sources' own `matches()`, kept
     honest by `test/unit/supported-domains.test.js`);
   - **deny** / **allow** — the host is on the fallback denylist/allowlist (the
     same `classifyHost` the popup uses, via `fallback-policy.js`);
   - **duplicate** — another **open** `extractor-request` issue already targets
     this host (lowest issue number wins; a prior step gathers the open peers with
     `gh` and passes them in, so the script stays offline).

   It also emits the event `url`, `host`, and the deterministic `slug`/`caseName`
   (`extractor-naming.js`) the later steps consume. Runs before `npm ci`, so a
   triaged request costs almost nothing, and fails **open** — any error proceeds.
3. **Probes the event URL** (`probe-url.js`): fetches it the same way the recorder
   will (shared `data/fetch-page.js` — browser headers + retries) and decides
   whether the page is **usable** as a static case. Not usable when: the URL is
   missing; the fetch returns anything but a 2xx (unreachable, login/bot wall);
   **or** it returns a 2xx whose body is actually a bot-challenge / interstitial —
   `detectChallenge` sniffs the body for known vendor markers (AWS WAF, Cloudflare,
   DataDome, PerimeterX, Imperva, reCAPTCHA/hCaptcha) and a suspiciously-small
   size, the one soft-200 block we can catch cheaply before handing off (#279
   StubHub). In every not-usable case there's no real page to record against, so
   the run **stops** — but stopping is an **expected outcome, not a failure**: the
   probe records its decision in `proceed`, the downstream steps gate on
   `proceed == 'true'`, and the run ends **green**. Because **none** of the
   not-usable outcomes is fixable by a re-run or the agent (a Cloudflare/WAF wall
   from a CI IP won't clear on retry any more than a 403 will), every one of them
   **hands the issue to a human** the same way: a single step **drops
   `extractor-request` and adds `extractor-blocked-needs-human`**, with a comment
   naming the blocker. The fetch that **fails outright** (`probe-url.js` exit 3 — a
   403 / unreachable host / login or bot wall, where the HTML never downloaded)
   sets a `downloadFailed` output so it gets a more specific "couldn't download the
   HTML" comment, but the label hand-off is identical to a soft-200 challenge or a
   missing URL. (A JS-rendered SPA shell that returns a full-but-empty page still
   slips past — a real 2xx with no markers — and is caught later by the agent's
   judgment.) Runs before `npm ci`.
4. Installs dependencies, configures git, and sets up a Chrome for Testing binary
   (`CHROME_PATH` + `RENDER_NO_SANDBOX`, mirroring `refresh-cache.yml`) so Phase 1's
   `npm run refresh` can render a JS single-page-app shell instead of recording an
   empty one (#334; without it every SPA — barby #325, visit.tel-aviv #277 —
   records a shell and the agent bails).
5. **Prepares the branch — Phase 1, all deterministic (`phase1-prepare.sh`):**
   branches `claude/extractor/<slug>` off `main`; records the page inline
   (`data/<caseName>.url` + the empty `.html` signal → `npm run refresh`, rendering
   an SPA shell via headless Chrome when `data/spa-shell.js` flags one, asserted
   non-empty); **scaffolds** `pipeline/sources/<slug>.js` with `matches()` filled
   (`scaffold-source.js`) **and the placeholder case
   `test/extractors/custom/<caseName>.json`** with empty `events`
   (`scaffold-case.js`); registers the host in `supportedDomains`
   (`add-supported-domain.js`); runs `npm run index` to regenerate the load lists;
   requires a green baseline `npm run test:offline`; then commits + pushes. The
   commit message is `chore: scaffold <slug> extractor …` — Phase 2 finds the
   **scaffold commit** by that message. (A `GITHUB_TOKEN` push doesn't fire
   `refresh-cache.yml`, so the page is recorded once.)
6. **Hands off to the agent (`handoff-to-agent.sh`):** posts a human-readable
   status comment, then swaps the label: removes `extractor-request`, adds
   `extractor-agent-ready`. **Adding that label is the trigger for the web
   routine.** No machine-readable hand-off is needed — the agent derives the
   branch + file names from the issue's event URL itself (same `extractor-naming.js`
   the workflow used; for the auto-recorded case `caseName == slug`).

## Stage 2 — the agent (Claude Code on the web)

A web routine wired to the `extractor-agent-ready` label runs the agent against
`agent-prompt-extractor.md`. The agent owns **only the judgment step**: derive the
branch from the issue's event URL, check it out, read the real cached page, fill in
`extract()` (and the source header), fill the pre-created case from the actual
`npm run test:live` output, confirm `test:live` + `test:offline` are green.

**The agent's write surface is exactly two files** — the source and the case.
It commits and pushes *only those two* (it runs in its own environment now, so it
must push for the finalize workflow to see its work), then re-labels:

- **success** → removes `extractor-agent-ready`, adds `extractor-agent-done` (the
  finalize trigger). It does **not** open the PR.
- **bail** → the cached page isn't **one specific event** (a bot/CAPTCHA/login/
  SPA-shell page, or a listing/index/artist/tour page showing many dates — a soft
  2xx the probe's `detectChallenge` can't see). It leaves the case's `events`
  empty, **posts a one-sentence diagnosis comment itself**, removes
  `extractor-agent-ready`, and adds `extractor-blocked-needs-human`. It does **not**
  add `extractor-agent-done`, so finalize never runs.

The two-file surface is a *containment guarantee*, not just an instruction, but the
guarantee is enforced by Stage 3 (the finalize workflow), not the agent — see
below. The prompt tells the agent to inline any helper logic into its own source
IIFE, as `meetup.js` does, rather than touch `pipeline/helpers/`.

## Stage 3 — the finalize workflow (Phase 2)

`.github/workflows/finalize-extractor.yml`, on `extractor-agent-done`. This is the
**external enforcement** of the agent's containment — it runs in a runner the agent
doesn't control, so the blast-radius guard is a guarantee rather than a request
(`docs/architectureGuidelines.md`). It:

1. **Re-derives the names** (`derive-names.js`) from the issue's event URL — the
   same `slug`/`caseName`/`host` Phase 1 used, from the same code — since the
   `labeled` event payload carries only the issue, not the branch.
2. Checks out the agent's branch (`phase2-finalize.sh` does the `git checkout`).
3. **Blast-radius guard:** finds the **scaffold commit** (the Phase-1 commit,
   matched by its message), then diffs the agent's commits against it. Because the
   agent now commits in a separate environment, this is a **commit diff**, not a
   working-tree diff: any file the agent changed *other than* the source + case is
   reverted to the scaffold state (a created file is removed) in a fresh commit, so
   a misbehaving agent can't reach the PR. (If the extractor truly depended on a
   reverted edit, the re-verify below goes red and no PR opens — exactly right.)
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

(And the same rule keeps Phase 1's `git push` from re-firing `refresh-cache.yml`,
so the page is recorded once.)

## Required secrets

| Secret | Purpose |
|--------|---------|
| `GITHUB_TOKEN` | Standard Actions token — automatically available, no setup needed |

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

Every run that touches an issue leaves a comment. The expected stops **finish
green** — only a genuine break is red:

- **Page not usable → handed to a human** (green, prepare) — the probe judged the
  page unusable: a 2xx bot-challenge / interstitial, a missing URL, or an outright
  download failure (exit 3 — a 403 / unreachable host / login or bot wall). No
  agent involved. Because none of these is fixable by a re-run, a single step
  removes `extractor-request`, adds `extractor-blocked-needs-human`, and names the
  blocker; the download-failure case gets a more specific "couldn't download the
  HTML" comment.
- **Bailed — not a single event** (green, Stage 2) — the agent judged the cached
  page a bot wall / SPA shell / listing page, commented its diagnosis, and set
  `extractor-blocked-needs-human`. No PR; scaffolding stays on the branch.
- **Anomaly handed to a human** (green, finalize) — `extractor-agent-done` arrived
  but the case is `empty` or `degenerate` (quality floor). Phase 2 comments and
  sets `extractor-blocked-needs-human`. No PR.
- **PR opened** (green, finalize) — the success path: re-verify passes, the PR
  opens, the link is commented, `extractor-agent-done` is cleared.
- **Unexpected failure** (red) — only a genuine break reaches a `failure()`
  comment (in either workflow). Common causes: the scaffold baseline or the
  re-verify went red; `npm ci` / page recording / git or PR work failed.

In any of these, fall back to the manual process in
`docs/claude/adding-a-source.md`.

## Review gate

The agent never merges the PR. A human must review:
- The extractor logic in `pipeline/sources/<slug>.js`
- The extracted values in `test/extractors/custom/<case-name>.json`
- That `matches(host)` is correct for the target domain

"LGTM" from the repo owner is the merge signal (see `docs/claude/github.md`). CI
must go green before merging; the extractor branch adds a deterministic offline
integration case (not an e2e/heavy-browser test), so one green run suffices.

## Updating the agent prompt

The prompt is `tools/new-extractors-creation/agent-prompt-extractor.md`. It is
**self-contained** — no placeholders, no build step: the web routine points the
agent at it, and the agent derives the per-issue specifics (branch, source path,
case path, host) from the issue's event URL via `extractor-naming.js`, exactly as
the prepare workflow did. Edit that file to change what the agent does or add
site-specific guidance; if the naming convention in `extractor-naming.js` ever
changes, the prompt's Step 0 must follow it.
