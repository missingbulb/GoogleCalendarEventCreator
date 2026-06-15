# Low-level design — file map

See [highLevelDesign.md](highLevelDesign.md) for how extraction works and
[architectureGuidelines.md](architectureGuidelines.md) for the rules of the road.

| File            | Purpose                                                       |
| --------------- | ------------------------------------------------------------- |
| `manifest.json` | Manifest V3 definition (`activeTab` + `scripting` + `tabs` permissions) |
| `config.js` | Tunable product decisions (durations, the event cap, the fallback host allow/denylist); imported by the popup modules |
| `fallback-policy.js` | The generic fallback's host classifier (`classifyHost`) + presentability gate, shared by the popup and the auto-extractor triage |
| `ui/popup.html`, `ui/popup.css`, `ui/popup.js` | Toolbar popup: controller that runs the extractor, picks a view (`chooseContent`), and renders it (markup + extracted styles) |
| `ui/views/events-view.js` | Renders one button per event (loaded on demand via `import()`) |
| `ui/views/source-request-view.js` | Unsupported-host affordances (loaded on demand): the prefilled-GitHub-issue "request support" button, and the "Disagree?" link to the policy doc |
| `ui/views/popup-states.html` | Static visual reference of the popup's five states; input to the UI snapshot test (not shipped — see `tools/shipping-files.js`) |
| `docs/extraction-policy.md` | Short public "how this extension finds events" doc the "Disagree?" link opens |
| `ui/toolbar-icon.js` | Background service worker: shows a green availability badge on the toolbar icon per tab (none on unsupported pages) |
| `pipeline/registry.js` | Bootstraps `GCal`, the `GCal.sources` registry, and `isSupportedHost` |
| `pipeline/helpers/` | Shared utilities any extractor may use, split by concern: DOM, text (rich-text/`htmlToText`/`parts`), dates, timezones, timezone-names, merge, and `embedded-events` (the `GCal.embeddedEvents` schema.org JSON-LD reader) |
| `pipeline/sources/meetup.js`, `facebook.js`, `eventbrite.js`, `edinburghfringe.js`, `telavivcinematheque.js`, `ticketmaster.js` | One self-contained scraper per supported event site, with hardcoded selectors + inline host matcher |
| `pipeline/extract-unsupported.js` | `GCal.unsupportedSiteEvents`: the fallback extractor for hosts with no source — best-effort event (embedded JSON-LD + generic heuristics); the popup shows it when complete (title + location + start) and the host isn't denylisted, else uses it to seed the source-request form |
| `pipeline/build-calendar-url.js` | Builds the pre-filled Google Calendar template URL (incl. markdown→HTML for details) |
| `pipeline/assemble-events.js` | Orchestrator `GCal.extract()`: runs the matched self-contained source, else the unsupported-site fallback; normalizes/sorts events and reports `supported` |
| `pipeline/load-order.generated.json` | Generated injection order (`npm run index`); single source of truth |
| `test/integration/cases/`   | Reviewed live-test cases (`description` + expected values), one JSON each |
| `data/` | Per-case cached HTML (`<name>.html`) the live tests assert against, each paired with its source URL (`<name>.url`) |
| `data/refresh-cache.js` | Fetches any missing or empty cached HTML file from its `<name>.url`          |
| `test/integration/live.test.js` | Runs the reviewed assertions against the cached HTML files |
| `test/unit/extraction.test.js`, `test/unit/calendar-url.test.js` | Internal offline unit tests |
| `test/harness.js` | Shared test harness (loads the pipeline files into a jsdom DOM and runs `GCal.extract()`) |
| `test/ui/popup-renderer.js` | Renders each popup state from `ui/views/popup-states.html` to PNG (satori + resvg, no browser), inlining the real `ui/popup.css` onto the markup first |
| `test/ui/snapshot-artifacts-dir.js` | Path of the gitignored dir the UI tests write `.actual.png`/`.diff.png` to on a mismatch |
| `test/ui/fonts/` | Bundled Liberation Sans font files used by the renderer (OFL-licensed) |
| `test/ui/popup-snapshots.test.js` | Renders the five popup states and compares each to its stored snapshot |
| `test/ui/refresh-popup-snapshots.js` | Regenerates the five `popup-state-*.png` snapshots in `test/ui/snapshots/` |
| `test/ui/snapshots/popup-state-*.png` | Committed reference images of the popup's five states, browsable on GitHub |
| `tools/gen_icons.py` | Regenerates the shipped toolbar PNG icons (Python stdlib only) |
| `tools/gen_store_icon.py` | Regenerates the Chrome Web Store icon `store-assets/icon-128.png` (Python stdlib only); a listing asset, not shipped in the zip |
| `tools/shipping-files.js` | Single source of truth for the files that ship in the release zip |
| `tools/build-zip.js` | Builds `dist/google-calendar-event-creator.zip` (`npm run build`) from the shipping list |
| `tools/triage-extractor-request.js` | Auto-extractor pre-flight: detects a request whose host is already allow/denylisted so the workflow can close it before the agent runs |
| `tools/gen-states-flowchart.js` | Regenerates `docs/popup-states-flowchart.png` (the five-states diagram) via an SVG + resvg |
| `test/unit/shipping-files.test.js` | Asserts the shipping list covers every runtime file and excludes dev/test files |
