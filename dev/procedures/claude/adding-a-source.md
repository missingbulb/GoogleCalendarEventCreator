# Adding a site extractor

When a site source's `matches(host)` is true, that source is the **only**
extractor the orchestrator runs for the page (`extension/event-extractors/assemble-events.js`) — it
must produce every field itself; the generic fallback heuristics run only for
*unsupported* hosts and are never merged over a site source. What a source *can*
lean on is the page's own schema.org JSON-LD: the convention is to return
`merge(domFields, embeddedEvents.toEvent(embeddedEvents.find()[0]))`, so the
source's DOM values win and JSON-LD fills the gaps they leave. The flow:

1. Add `extension/event-extractors/custom/<site>.js` that pushes onto `GCal.sources` with
   `name`, an inline `matches(hostname)`, and an `extract()` returning a partial
   event object. The `matches` function is the single thing that makes a page
   count as supported — it both gates the source and drives the green
   ("supported") vs. red toolbar icon. Follow `extension/event-extractors/custom/meetup.js` as
   the template, including the header comment describing the HTML it expects.
   Use the shared helpers on `GCal` (see `extension/event-extractors/helpers/`); return only the
   fields this site needs.
2. Run `npm run index` to regenerate the load list from the sources on disk:
   `extension/event-extractors/load-order.generated.json` (the single source of truth the popup
   injects and the tests read). The generator pins `registry.js`/`helpers/`
   first and `assemble-events.js` last and sorts the rest, so you never hand-edit
   the list — and adding a source touches no file in `extension/events-popup/`; a CI test fails if
   it's stale.
3. Add the new host to `supportedDomains` in `extension/fallback-lists.json`. This
   static list is the static mirror of the sources' `matches()`
   (`extension-test/integration/supported-domains.test.js` fails if it drifts), and the toolbar
   service worker (`extension/icon/toolbar-icon.js`) builds its `chrome.declarativeContent`
   icon rules from it — so the green "supported" icon only appears once the host
   is listed here.
4. Add an integration case for a real page on the site (see `dev/procedures/testing.md`) —
   a reviewed `dev/requirements/extractor/expected/<name>.json` (`description`
   + `expected`) plus its cached `dev/requirements/extractor/data/<name>.{html,url}`.
5. Record the host as an **executable extractor-support requirement**: add a leaf
   to `dev/requirements/requirements.md` §11 ("Required explicit support for
   Extractors") with an extractor case
   (`dev/requirements/extractor/cases/extractor-support.11.<n>.case.js` — the
   `extractor/` folder is its kind) naming `{ host, source, page }`, so the new host
   is validated against a real cached page by
   `dev/requirements/extractor/extractor-support.test.js`. See
   [../../requirements/README.md](../../requirements/README.md).
