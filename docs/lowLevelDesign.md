# Low-level design — file map

See [highLevelDesign.md](highLevelDesign.md) for how extraction works and
[architectureGuidelines.md](architectureGuidelines.md) for the rules of the road.

| File            | Purpose                                                       |
| --------------- | ------------------------------------------------------------- |
| `manifest.json` | Manifest V3 definition (`activeTab` + `scripting` + `tabs` permissions) |
| `ui/popup.html`, `ui/popup.css`, `ui/popup.js` | Toolbar popup: controller that runs the extractor, picks a view, and renders it (markup + extracted styles) |
| `ui/views/events-view.js` | Renders one button per event (loaded on demand via `import()`) |
| `ui/views/source-request-view.js` | Source-request flow (prefilled GitHub issue) for unsupported pages (loaded on demand) |
| `ui/toolbar-icon.js` | Background service worker: shows a green availability badge on the toolbar icon per tab (none on unsupported pages) |
| `pipeline/registry.js` | Bootstraps `GCal`, the `GCal.sources` registry, and `isSupportedHost` |
| `pipeline/helpers/` | Shared utilities any extractor may use, split by concern: DOM, text (rich-text/`htmlToText`/`parts`), dates, timezones, timezone-names, merge, and `embedded-events` (the `GCal.embeddedEvents` schema.org JSON-LD reader) |
| `pipeline/sources/meetup.js`, `facebook.js`, `eventbrite.js`, `edinburghfringe.js`, `telavivcinematheque.js`, `ticketmaster.js` | One self-contained scraper per supported event site, with hardcoded selectors + inline host matcher |
| `pipeline/extract-unsupported.js` | `GCal.unsupportedSiteEvents`: the fallback extractor for hosts with no source — best-effort event (embedded JSON-LD + generic heuristics) used only to seed the source-request form |
| `pipeline/build-calendar-url.js` | Builds the pre-filled Google Calendar template URL (incl. markdown→HTML for details) |
| `pipeline/assemble-events.js` | Orchestrator `GCal.extract()`: runs the matched self-contained source, else the unsupported-site fallback; normalizes/sorts events and reports `supported` |
| `pipeline/load-order.generated.json` | Generated injection order (`npm run index`); single source of truth |
| `test/integration/cases/`   | Reviewed live-test cases (`description` + expected values), one JSON each |
| `data/` | Per-case cached HTML (`<name>.html`) the live tests assert against, each paired with its source URL (`<name>.url`) |
| `data/refresh-cache.js` | Fetches any missing or empty cached HTML file from its `<name>.url`          |
| `test/integration/live.test.js` | Runs the reviewed assertions against the cached HTML files |
| `test/unit/extraction.test.js`, `test/unit/calendar-url.test.js` | Internal offline unit tests |
| `test/harness.js` | Shared test harness (loads the pipeline files into a jsdom DOM and runs `GCal.extract()`) |
| `test/ui/popup-fixtures.js` | Fixed extraction result + tab info used to render the popup deterministically |
| `test/ui/popup-helpers.js` | Loads pure helpers (e.g. `formatWhen`) from `ui/views/events-view.js` for use in `popup-renderer.js` |
| `test/ui/popup-renderer.js` | Renders an approximation of the popup to PNG via satori + resvg (no browser) |
| `test/ui/snapshot-artifacts-dir.js` | Path of the gitignored dir the UI tests write `.actual.png`/`.diff.png` to on a mismatch |
| `test/ui/fonts/` | Bundled Liberation Sans font files used by the renderer (OFL-licensed) |
| `test/ui/popup-snapshots.test.js` | Compares the rendered popup against the stored snapshot |
| `test/ui/refresh-popup-snapshots.js` | Regenerates `test/ui/snapshots/popup-single-event.png` and `popup-multi-event.png` |
| `test/ui/snapshots/popup-single-event.png`, `popup-multi-event.png` | Committed reference images of the popup (single / multiple events), browsable on GitHub |
| `tools/gen_icons.py` | Regenerates the shipped toolbar PNG icons (Python stdlib only) |
| `tools/gen_store_icon.py` | Regenerates the Chrome Web Store icon `store-assets/icon-128.png` (Python stdlib only); a listing asset, not shipped in the zip |
| `tools/shipping-files.js` | Single source of truth for the files that ship in the release zip |
| `tools/build-zip.js` | Builds `dist/google-calendar-event-creator.zip` (`npm run build`) from the shipping list |
| `test/unit/shipping-files.test.js` | Asserts the shipping list covers every runtime file and excludes dev/test files |
