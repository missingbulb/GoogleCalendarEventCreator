# extractor-pipeline rules

Standing rules for this repo's extractor-automation domain: the create-extractor
routine (an `extractor-request` issue → a PR adding site support), the daily
auto-fallback-coverage routine, and the cached-live-case corpus they share. The
routine specs live beside their gates under [run_daily/](run_daily/) — read one
only when working on that routine; the live-case authoring procedure is the
[add-live-case](skills/add-live-case/SKILL.md) skill.

- **All page fetching is delegated to ScraperAPI via the fetch-page workflow**
  (`.github/workflows/fetch-page.yml`): a bare curl through ScraperAPI's
  residential proxy with `render=true`, so a single-page app records post-render
  HTML with real data. Bot-blocking from CI/sandbox IPs is the portable rule
  maintained in the canon; here the escape hatch is the `SCRAPER_API_KEY`
  **GitHub Actions secret** — a page is recorded by dispatching that workflow
  (the create-extractor routine does this in its step 4), never by a local fetch
  (this sandbox is bot-blocked). ScraperAPI is the whole fetching surface — swap
  the vendor in that one workflow if it underperforms. The aid for a flaky SPA
  render is the **`Wait-for selector`** a source request can carry
  (`extension/events-popup/derive-wait-selector.js`, a source-request tool, NOT
  an event extractor, #603), passed to the workflow as `wait_for_selector`.
- **Facebook can't be a cached live case** — a hard HTTP 400 even through the
  proxy, so its extraction stays unit-tests-only
  (`extension-test/event-extractors/extraction.test.js`).
- **Rendered output isn't deterministic.** A re-record can legitimately shift a
  live case's `expected` — treat such drift like a site-markup change, and prefer
  extracting JSON-LD/`og:` (which apps still inject) over brittle DOM positions.
- **`fetch-page.yml` is attended by its dispatcher** (this repo's
  workflow-failure classification): the create-extractor routine dispatches it,
  polls the run, and on failure labels the issue `extractor-blocked-needs-human`
  — a red run reaches a human through the routine, not the Actions list, so the
  workflow carries no failure reporter (and being dispatch-only it never runs
  unwatched).
- **The fallback-coverage gate is a high-watermark over a changing case set.**
  It ratchets up on an unchanged case set and re-anchors when the set changes,
  compared over the cases the runs **share** — so adding an extractor never
  fails it (#240) while a pre-existing case that regresses still does. A
  removed/renamed case the watermark still lists makes it stale: the local
  refresh re-anchors it (commit that); in CI it's an error to fix. *Caveat:*
  never commit a re-anchored baseline while the gate is red — a regression
  bundled with a case-set change can be re-anchored over. Detailed mechanics
  self-document in the gate's own headers
  (`dev/requirements/extractor/fallback/fallback-coverage.js` / `.test.js`).
- **To see what the generic/unsupported extractor gets** on any cached page —
  even a supported host — load the files, set `GCal.sources = []`, then call
  `GCal.extract()`: the documented way to force the unsupported-host path
  through the same norm/sort the popup uses. Most start/end *differences* vs a
  dedicated source are just its hardcoded `ctz` localizing to floating time
  (same instant), not extraction bugs; the real gaps are fields it can't know
  generically (durations, site-specific descriptions, and — where the page
  doesn't declare corroborating hints, see `helpers/derive-timezone.js` —
  `ctz`). This is the comparison the fallback-coverage gate automates.
