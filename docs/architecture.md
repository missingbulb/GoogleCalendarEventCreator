# Architecture

## How extraction works

Extraction runs in three layers, merged field-by-field (first non-empty wins):

1. **Site-specific scrapers** with hardcoded selectors for the major event
   sites: **meetup.com**, **facebook.com** events, **eventbrite.com**,
   **edfringe.com** (Edinburgh Festival Fringe), **cinema.co.il** (Tel
   Aviv Cinematheque), and **ticketmaster.co.il** (Ticketmaster Israel). Each
   lives in its own file under `pipeline/sources/` with a
   comment describing the HTML it expects; to support a new platform, add a
   file there following the same pattern and run `npm run index` to regenerate
   the load list (`pipeline/load-order.generated.json`).
2. **schema.org JSON-LD** (`<script type="application/ld+json">` with an
   `Event` type) — most event pages publish this, so it's the strongest
   generic signal.
3. **Generic heuristics** for any other page: microdata
   (`itemprop="startDate"` etc.), Open Graph / meta tags, `<time datetime>`
   elements, `<h1>`/`<address>` tags, venue/location-named elements, and
   finally a date/time pattern scan over the page's visible text
   ("June 14, 2026 at 7 PM", "14 June 2026, 19:30", "6/14/2026", ISO dates, …).

The extractor always returns a list of events (`{ events: [...] }`), each one
self-described (title, date/time, location, description, timezone). When a
page describes **several distinct events** — a film week or festival listing,
several JSON-LD events, etc. — every event is returned and the popup shows
**one button per event** so you can pick which one to add. An ordinary event
page yields a single event/button; a film that merely has several screening
dates stays one event. The events are ordered by start time, so they read
chronologically regardless of the order the page listed them in.

Dates without a timezone offset are passed as floating local times, so the
event shows the same wall-clock time the page displayed. Dates with an
explicit offset (or trailing `Z`) are converted to an exact UTC instant before
being passed to Google Calendar, so the event occurs at the same moment in time
regardless of the viewer's own timezone. When no end time is found, a 2-hour
duration is assumed. A date without a time becomes an all-day event.

A site extractor that knows an event's location is fixed (e.g. a festival
that only ever runs in one city) can set `ctz` to that timezone (e.g. `"GB"`
for the Edinburgh Festival Fringe); it's passed straight through as the
Calendar URL's `ctz` parameter. When `ctz` is set, an absolute start/end (one
carrying an offset or `Z`) is re-expressed as the floating local wall-clock
time in that timezone — so there's no need to keep it in UTC: the value reads
as the time the event's own city shows, and the `ctz` parameter places it
correctly regardless of the viewer's own timezone.

## Files

| File            | Purpose                                                       |
| --------------- | ------------------------------------------------------------- |
| `manifest.json` | Manifest V3 definition (`activeTab` + `scripting` + `tabs` permissions) |
| `ui/popup.html`, `ui/popup.css`, `ui/popup.js` | Toolbar popup: controller that runs the extractor, picks a view, and renders it (markup + extracted styles) |
| `ui/views/events-view.js` | Renders one button per event (loaded on demand via `import()`) |
| `ui/views/source-request-view.js` | Source-request flow (prefilled GitHub issue) for unsupported pages (loaded on demand) |
| `ui/toolbar-icon.js` | Background service worker: updates the toolbar icon's border color per tab |
| `pipeline/registry.js` | Bootstraps `GCal`, the `GCal.sources` registry, and `isSupportedHost` |
| `pipeline/helpers/` | Shared helpers split by concern (DOM, dates, timezones, timezone-names, merge) |
| `pipeline/sources/meetup.js`, `facebook.js`, `eventbrite.js`, `edinburghfringe.js`, `telavivcinematheque.js`, `ticketmaster.js` | One file per supported event site, with hardcoded selectors + inline host matcher |
| `pipeline/extract-jsonld.js` | schema.org JSON-LD extraction                          |
| `pipeline/extract-generic.js` | Heuristics for any page + multiple-event detection    |
| `pipeline/build-calendar-url.js` | Builds the pre-filled Google Calendar template URL |
| `pipeline/assemble-events.js` | Orchestrator: picks sources, merges results, reports `supported` |
| `pipeline/load-order.generated.json` | Generated injection order (`npm run index`); single source of truth |
| `test/integration/cases/`   | Reviewed live-test cases (`description` + expected values), one JSON each |
| `data/` | Per-case cached HTML (`<name>.html`) the live tests assert against, each paired with its source URL (`<name>.url`) |
| `data/refresh-cache.js` | Fetches any missing or empty cached HTML file from its `<name>.url`          |
| `test/integration/live.test.js` | Runs the reviewed assertions against the cached HTML files |
| `test/unit/extraction.test.js`, `test/unit/calendar-url.test.js` | Internal offline unit tests |
| `test/harness.js` | Shared test harness (loads the pipeline files into a jsdom DOM) |
| `test/ui/popup-fixtures.js` | Fixed extraction result + tab info used to render the popup deterministically |
| `test/ui/popup-helpers.js` | Loads pure helpers (e.g. `formatWhen`) from `ui/views/events-view.js` for use in `popup-renderer.js` |
| `test/ui/popup-renderer.js` | Renders an approximation of the popup to PNG via satori + resvg (no browser) |
| `test/ui/snapshot-artifacts-dir.js` | Path of the gitignored dir the UI tests write `.actual.png`/`.diff.png` to on a mismatch |
| `test/ui/fonts/` | Bundled Liberation Sans font files used by the renderer (OFL-licensed) |
| `test/ui/popup-snapshots.test.js` | Compares the rendered popup against the stored snapshot |
| `test/ui/refresh-popup-snapshots.js` | Regenerates `test/ui/snapshots/popup-single-event.png` and `popup-multi-event.png` |
| `test/ui/snapshots/popup-single-event.png`, `popup-multi-event.png` | Committed reference images of the popup (single / multiple events), browsable on GitHub |
| `test/ui/icon-renderer.js` | Renders the expected toolbar icon (green/red border) to PNG, no browser |
| `test/ui/toolbar-icon-snapshots.test.js` | Compares the rendered toolbar icon for each state against the stored snapshots and `icons/icon128-{green,red}.png` |
| `test/ui/refresh-icon-snapshots.js` | Regenerates `test/ui/snapshots/icon-{unsupported,supported}.png` |
| `test/ui/snapshots/icon-unsupported.png`, `icon-supported.png` | Committed reference images of the toolbar icon for unsupported/supported pages, browsable on GitHub |
| `tools/gen_icons.py` | Regenerates the shipped toolbar PNG icons (Python stdlib only) |
| `tools/gen_store_icon.py` | Regenerates the Chrome Web Store icon `store-assets/icon-128.png` (Python stdlib only); a listing asset, not shipped in the zip |
| `tools/shipping-files.js` | Single source of truth for the files that ship in the release zip |
| `tools/build-zip.js` | Builds `dist/google-calendar-event-creator.zip` (`npm run build`) from the shipping list |
| `test/unit/shipping-files.test.js` | Asserts the shipping list covers every runtime file and excludes dev/test files |
