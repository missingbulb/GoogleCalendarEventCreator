# Create-extractor routine

A Claude Code routine, **label-wired**: it fires when the `extractor-request` label
lands on a GitHub issue and implements a site extractor (or hardens an existing
one) for the event page that issue names — end to end, in one session. Everything
deterministic is offloaded to the numbered scripts (`1-`…`4-`) and the helpers they
call; you own the **judgment** — deciding the route and writing `extract()` — and
every GitHub interaction (the shell here has no GitHub API, so issues/labels/PRs are
your MCP tool calls). The event page is recorded by the **fetch-page GitHub Action**
(step 4), which holds `SCRAPER_API_KEY` as an Actions secret — the routine's own
environment never sees the key. The owner provisions that secret once in the repo's
Actions settings; nothing else external is needed.

Run the stages in order. A script that exits non-zero stops the run the way its
step describes — most stops hand the issue to a human, none open a PR.

## 1. Precondition

```sh
bash dev/routines/create-extractor/1-preconditions.sh
```

Non-zero → **stop** (dirty tree; it printed why). Otherwise `npm install` once, then
continue.

## 2. Triage — pick the route

Read the triggering issue (the one just labelled `extractor-request`): its body,
title, and number. Gather the **other open `extractor-request` issues** via the
GitHub tools and write that JSON array (`[{number,title,body}, …]`) to a temp file,
then run:

```sh
OPEN_REQUESTS_FILE=<that file> ISSUE_BODY=<body> ISSUE_TITLE=<title> ISSUE_NUMBER=<n> \
  node dev/routines/create-extractor/2-triage.js
```

It prints one JSON object — `{ skipAgent, reason, mode, url, host, waitSelector,
caseName, branch, sourcePath, duplicateOf, message, … }` — decided by running the
sources' real `matches()` and the popup's `classifyHost` (so the routine and the
shipped extension can't disagree). Act on `reason`:

- **`deny` / `allow`** → this host is handled (or deliberately not); **close the
  issue** as not planned with `message`, and stop.
- **`sample`** → another open request (`#duplicateOf`) already owns this host. Fold
  this page into that leader issue as an extra sample: fetch the leader's body,
  rewrite it with `node dev/routines/create-extractor/attach-sample-url.js` (pass the
  body + this `url`), post the rewritten body, comment + close this issue with
  `message`, and stop.
- **anything else** (`supported` or a blank reason) → **proceed**. Keep triage's
  `mode`/`branch`/`caseName`/`host`/`url`/`sourcePath`/`waitSelector` — the next
  stages take them as env.

## 3. Prepare — scaffold + push (deterministic)

```sh
MODE=<mode> BRANCH=<branch> CASE_NAME=<caseName> HOST=<host> EVENT_URL=<url> \
  ISSUE_NUMBER=<n> \
  bash dev/routines/create-extractor/3-prepare.sh
```

It branches, writes the page's `.url`, scaffolds (a new source + case in `new` mode;
only a case in `supported` mode), proves a green offline baseline, commits the
scaffold, and **pushes the branch** (so the fetch workflow can run on it). It does
**not** record the page — that's step 4. Non-zero → **comment the failure and label
the issue `extractor-blocked-needs-human`**, then stop.

## 4. Fetch — record the page via the GitHub Action

The page fetch lives in a workflow (`.github/workflows/fetch-page.yml`) because it
needs `SCRAPER_API_KEY`, which GitHub holds as an Actions secret and the routine's
own environment does not. **Dispatch it on the pushed branch** with the MCP GitHub
tools — `ref = <branch>`, inputs `case_name = <caseName>`, `url = <url>`, and
`wait_for_selector = <waitSelector>` (omit/blank if triage gave none):

```
actions_run_trigger(workflow="fetch-page.yml", ref=<branch>,
  inputs={case_name:<caseName>, url:<url>, wait_for_selector:<waitSelector>})
```

Then **poll the run to completion** (`actions_list`/`actions_get`, on the short
back-off in the gcec pack's merge-and-ci skill
(`.claudinite/local_packs/gcec/skills/merge-and-ci/SKILL.md`) — this environment
can't observe GitHub state from the shell). The workflow records the page and commits
`dev/requirements/extractor/data/server-fetched/<caseName>.html` back to the branch
with `[skip ci]`. On completion:

- **success** → `git pull origin <branch>` to bring the recorded `.html` into the
  working tree, then continue to step 5.
- **failure** → the page couldn't be recorded (bot wall / dead URL / empty render):
  **comment the failure and label the issue `extractor-blocked-needs-human`**, then
  stop.

(`workflow_dispatch` only works once `fetch-page.yml` is on `main`; a branch cut
from `main` inherits it, so this is a no-op concern in steady state.)

## 5. Implement — write the extractor (your judgment)

**Your write surface is exactly two files** — the source and the case —
and `4-postconditions.sh` fails the run if anything else changed, so straying
wastes effort:

- **new-source mode**: fill `extract()` (and its header comment) in the scaffolded
  `sourcePath`; **leave `matches()` alone**.
- **add-a-case mode**: `sourcePath` is **shipped code other cases depend on**.
  Prefer not to touch it — add the case and see if it already passes. Change it
  **only if** the new page genuinely doesn't extract, and then make the *smallest*
  change that passes the new case **without regressing any existing case**. Never
  refactor it; never touch `matches()`. Do not touch the shared
  `extension/event-extractors/helpers/` — inline any helper you need into the
  source's IIFE, as `meetup.js` does.

First, **is the recorded page one usable event?** (`wc -c` it, open it.) It must
carry at least one fully-formed event — a title with a specific date **and** a
venue/location. **Bail** (Step below) only when there's nothing a static extractor
can turn into a calendar event: a bot/login/cookie wall, an empty SPA shell, or a
listing/tour/artist page whose entries aren't complete events (a location-less
event is rejected by the quality floor). A page showing *several complete* events
is **not** a bail — return them all (see below); let the form's "Number of events"
field guide you (a `1` that yields a multi-date listing is a sign to re-examine).

Then write it, **filling the case from the real run, never by hand**:

```sh
CI=1 npm run test:live 2>&1   # placeholder case fails but PRINTS the real extracted values
```

Run it with **`CI=1`**: a plain `npm run test:live` locally rewrites the two
`dev/requirements/extractor/fallback/fallback-coverage*.GENERATED.*` files, which are
**outside** the routine's two-file write surface and make step 6's scope check fail;
`CI=1` skips that refresh (the committed baseline is the CI truth) and still prints the
values. If a run without it dirtied them, `git checkout --` those two files before step 6.

Copy those values into the case's `expected` (there is **no `url` field** — the URL
lives in the `data/server-fetched/<caseName>.url` file), write a one-line
`description`, and cross-check against the issue's hints — which are a generic
auto-scrape and **often wrong** (a US venue on a `.de` URL, `[object Object]`, a
mismatched date). A large divergence (different country/date/venue) is a **red flag
to re-examine whether this is really one event**, not a cue to copy the hints in.
Then confirm both suites are green (`CI=1 npm run test:live`, `npm run test:offline`).

**Bail** (the page was not one usable event): leave the case's `events` empty, make
no source change, **comment a one-sentence diagnosis of what the page actually is,
label the issue `extractor-blocked-needs-human`**, and stop. No PR.

## 6. Postcondition

```sh
MODE=<mode> BRANCH=<branch> CASE_NAME=<caseName> SOURCE_PATH=<sourcePath> \
  ISSUE_NUMBER=<n> bash dev/routines/create-extractor/4-postconditions.sh
```

It re-checks the scope (only the two files changed, plus the workflow-recorded
page), the quality floor (a real, located event — not `empty`/`degenerate`), and
re-verifies the whole suite. Non-zero → **comment the printed reason, label
`extractor-blocked-needs-human`, no PR**, and stop.

## 7. Open the PR (never merge)

Commit the two files, push the branch, and open a **PR for review** via the GitHub
tools with `Closes #<n>` in the body — new-source: *"Implements the extractor for
`<host>`"*; add-a-case: *"Adds an integration case for `<host>` (hardens
`<sourceBase>`)"*. Comment the PR link on the issue. It never merges itself; a human
reviews the `extract()` logic / case values (and any minimal source edit). Because
you open the PR with the GitHub App's token, `test.yml` runs on it normally — one
green run suffices (the extractor adds a deterministic offline case, not an
e2e/heavy test).

---

## What a correct extractor looks like

When `matches(host)` is true, **that source is the only extractor that runs for the
page** (`extension/event-extractors/assemble-events.js`) — it must produce every
field itself; the generic fallback runs only for *unsupported* hosts and won't fill
gaps. What a source *can* lean on is the page's own schema.org JSON-LD: sources
typically end with

```js
return merge(dom, embeddedEvents.toEvent(embeddedEvents.find()[0]));
```

so DOM fields win where present and the page's embedded event fills the rest.
Read `extension/event-extractors/custom/meetup.js` as the canonical single-event
example and `custom/telavivcinematheque.js` as the multi-event/series one (return an
object with an `events` array, one entry per occurrence; the orchestrator groups
same-titled showings); skim `extension/event-extractors/helpers/{dom,text,dates}.js`
for the shared `GCal` helpers. Supply only the fields the page needs; don't invent a
`ctz` you can't derive — but a `ctz` you *can* derive isn't optional: when the page
states the venue's country (even only as free text in the address) and that country
has a single timezone, derive it (`custom/somo.js` maps the address country → zone via
`GCal.COUNTRY_TIMEZONES`). A `+00:00`/`Z` start/end is UTC *serialization*, not the
venue's zone — it neither supplies the `ctz` nor vetoes deriving one from the venue.
`matches()` (already filled by the scaffold) is the single
thing that makes a page count as supported — it gates the source *and* drives the
green toolbar icon, and its host must also be in `supportedDomains`
(`extension/fallback-lists.json`), which the scaffold registered.

## Manual fallback

When the routine hands an issue to a human (`extractor-blocked-needs-human`), or to
add a source by hand: follow the same shape — add `custom/<site>.js`, `npm run
index`, register the host in `supportedDomains`, add a reviewed case (the
[add-live-case](../../../.claudinite/local/packs/gcec/skills/add-live-case/SKILL.md) skill), and record the host
as an extractor-support requirement leaf in `dev/requirements/requirements.md`
§11 (see [`dev/requirements/README.md`](../../requirements/README.md)).
