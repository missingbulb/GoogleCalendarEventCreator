# File descriptions

A per-file map of the repo. See [highLevelDesign.md](highLevelDesign.md) for how
extraction works, [productRequirements.md](productRequirements.md) for what the
extension does, and [architectureGuidelines.md](architectureGuidelines.md) for
the rules of the road.

| File            | Purpose                                                       |
| --------------- | ------------------------------------------------------------- |
| `manifest.json` | Manifest V3 definition (`activeTab` + `scripting` + `declarativeContent` permissions) |
| `config.js` | Tunable product decisions (durations, the event cap, the fallback host allow/denylist); imported by the popup modules |
| `fallback-policy.js` | The generic fallback's host classifier (`classifyHost`) + presentability gate, shared by the popup and the auto-extractor triage |
| `ui/popup.html`, `ui/popup.css`, `ui/popup.js` | Toolbar popup: controller that runs the extractor, picks a view (`chooseContent`), and renders it (markup + extracted styles) |
| `ui/views/events-view.js` | Renders one card per event — a clickable button for a single occurrence, or a grouped card with a button per showing for a multi-instance event (loaded on demand via `import()`) |
| `ui/views/source-request-view.js` | The two heading-line links for an unsupported host (loaded on demand): "Suggest Correction" (opens the prefilled GitHub issue) and "Disagree?" (opens the policy doc) |
| `docs/extraction-policy.md` | Short public "how this extension finds events" doc the "Disagree?" link opens |
| `ui/toolbar-icon.js` | Background service worker: registers `chrome.declarativeContent` rules (from `fallback-lists.json`) so the browser colors the toolbar icon by host pattern — green on supported hosts, gray on denylisted ones, blue elsewhere — without the extension reading any tab URL |
| `pipeline/registry.js` | Bootstraps `GCal`, the `GCal.sources` registry, and `isSupportedHost` |
| `pipeline/helpers/` | Shared utilities any extractor may use, split by concern: DOM, text (rich-text/`htmlToText`/`parts`), dates, timezones, timezone-names, merge, and `embedded-events` (the `GCal.embeddedEvents` schema.org JSON-LD reader) |
| `pipeline/sources/meetup.js`, `facebook.js`, `eventbrite.js`, `edinburghfringe.js`, `telavivcinematheque.js`, `ticketmaster.js` | One self-contained scraper per supported event site, with hardcoded selectors + inline host matcher |
| `pipeline/extract-unsupported.js` | `GCal.unsupportedSiteEvents`: the fallback extractor for hosts with no source — best-effort event (embedded JSON-LD + generic heuristics); the popup shows it when complete (title + location + start) and the host isn't denylisted, else uses it to seed the source-request form |
| `pipeline/build-calendar-url.js` | Builds the pre-filled Google Calendar template URL (incl. markdown→HTML for details) |
| `pipeline/assemble-events.js` | Orchestrator `GCal.extract()`: runs the matched self-contained source, else the unsupported-site fallback; normalizes/sorts events and reports `supported` |
| `pipeline/load-order.generated.json` | Generated injection order (`npm run index`); single source of truth |
| `test/extractors/custom/`   | Reviewed live-test cases (`description` + expected values), one JSON each |
| `data/` | Per-case cached HTML (`<name>.html`) the live tests assert against, each paired with its source URL (`<name>.url`) |
| `data/refresh-cache.js` | Fetches any missing or empty cached HTML file from its `<name>.url`          |
| `test/extractors/live.test.js` | Runs the reviewed assertions against the cached HTML files |
| `test/unit/extraction.test.js`, `test/unit/calendar-url.test.js` | Internal offline unit tests |
| `test/harness.js` | Shared test harness (loads the pipeline files into a jsdom DOM and runs `GCal.extract()`) |
| `test/extractors/fallback/fallback-coverage.js` | Compares the generic fallback to each dedicated source across the cached cases (the coverage gate's logic + the report renderer) |
| `test/extractors/fallback/fallback-coverage.test.js` | High-watermark gate on the fallback's field coverage vs. the dedicated sources; refreshes `test/extractors/fallback/fallback-coverage.GENERATED.md` and ratchets the baseline locally |
| `test/extractors/fallback/fallback-coverage.baseline.GENERATED.json` | Stored high-watermark percentages the coverage gate asserts against (test-rewritten; `GENERATED` in the name flags it — don't hand-merge) |
| `test/extractors/fallback/fallback-coverage.GENERATED.md` | Generated report: what the fallback recovers vs. the dedicated sources, per host / field type / case |
| `test/ui/cases/<name>.case.js` | One UI snapshot case: fake data (`{ description, data, listing?, tab?, action? }`) fed to the popup's real `render()`. Its scenario lives only here — no shared gallery |
| `test/ui/cases/<name>.png` | Committed reference image for the matching case, browsable on GitHub |
| `test/ui/actions.js` | Reusable `(document) => void` case gestures (e.g. `scrollToBottom`, which pins `#events` so satori paints the bottom) |
| `test/ui/popup-renderer.js` | Builds each case's DOM via the popup's real `render()` and rasterizes to PNG (satori + resvg, no browser), inlining the real `ui/popup.css` first; prunes off-screen list rows so resvg doesn't choke on a tall SVG |
| `test/ui/snapshot-artifacts-dir.js` | Path of the gitignored dir the UI tests write `.actual.png`/`.diff.png` to on a mismatch |
| `test/ui/fonts/` | Bundled Liberation Sans font files used by the renderer (OFL-licensed) |
| `test/ui/popup-snapshots.test.js` | Renders each `test/ui/cases/*.case.js` and compares it to its stored snapshot |
| `test/ui/refresh-popup-snapshots.js` | Regenerates the `test/ui/cases/*.png` snapshots |
| `tools/gen_icons.py` | Regenerates the shipped toolbar PNG icons (Python stdlib only) |
| `tools/gen_store_icon.py` | Regenerates the Chrome Web Store icon `store-assets/icon-128.png` (Python stdlib only); a listing asset, not shipped in the zip |
| `tools/shipping-files.js` | Single source of truth for the files that ship in the release zip |
| `tools/build-zip.js` | Builds `dist/google-calendar-event-creator.zip` (`npm run build`) from the shipping list |
| `tools/new-extractors-creation/` | The auto-implement-extractor pipeline in one folder: the self-contained agent prompt, the deterministic Node steps (triage, probe, naming, derive-names, scaffold-source/case, add-supported-domain, case-quality), and the workflows' phase scripts (`phase1-prepare.sh`, `handoff-to-agent.sh`, `phase2-finalize.sh`). A three-stage label relay: prepare workflow → Claude Code web routine → finalize workflow. See `docs/claude/auto-extractor.md` |
| `tools/new-extractors-creation/triage-extractor-request.js` | Auto-extractor pre-flight: detects a request whose host is already allow/denylisted so the workflow can close it before the agent runs |
| `tools/gen-states-flowchart.js` | Regenerates `docs/popup-states-flowchart.png` (the five-states diagram) via an SVG + resvg |
| `test/unit/shipping-files.test.js` | Asserts the shipping list covers every runtime file and excludes dev/test files |
