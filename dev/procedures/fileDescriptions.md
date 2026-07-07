# File descriptions

A per-file map of the repo. See [highLevelDesign.md](highLevelDesign.md) for how
extraction works (and its "rules of the road" section), and
[requirements.md §12–§16](../requirements/requirements.md) for what the
extension does.

| File            | Purpose                                                       |
| --------------- | ------------------------------------------------------------- |
| `extension/manifest.json` | Manifest V3 definition (`activeTab` + `scripting` + `declarativeContent` permissions) |
| `extension/config.js` | Tunable product decisions (durations, the event cap, the fallback host allow/denylist); imported by the popup modules |
| `extension/fallback-policy.js` | The generic fallback's host classifier (`classifyHost`) + presentability gate, shared by the popup and the auto-extractor triage |
| `extension/events-popup/popup.html`, `extension/events-popup/popup.css`, `extension/events-popup/popup.js` | Toolbar popup: controller that runs the extractor, picks a view (`chooseContent`), and renders it (markup + extracted styles) |
| `extension/events-popup/events-view.js` | Renders one card per event — a clickable button for a single occurrence, or a grouped card with a button per showing for a multi-instance event (loaded on demand via `import()`) |
| `extension/events-popup/source-request-view.js` | The unsupported-host affordances (loaded on demand): "Suggest Correction" (opens the prefilled GitHub issue) and "Disagree?" (expands the `POLICY_EXPLANATION` "how this works" text inline in the popup, with an "open an issue" link) |
| `extension/icon/toolbar-icon.js` | Background service worker: registers `chrome.declarativeContent` rules (from `fallback-lists.json`) so the browser colors the toolbar icon by host pattern — green on supported hosts, gray on denylisted ones, blue elsewhere — without the extension reading any tab URL |
| `extension/event-extractors/registry.js` | Bootstraps `GCal`, the `GCal.sources` registry, and `isSupportedHost` |
| `extension/event-extractors/helpers/` | Shared utilities any extractor may use, split by concern: DOM, text (rich-text/`htmlToText`/`parts`), dates, timezones, timezone-names, merge, and `embedded-events` (the `GCal.embeddedEvents` schema.org JSON-LD reader) |
| `extension/event-extractors/custom/meetup.js`, `facebook.js`, `eventbrite.js`, `edinburghfringe.js`, `telavivcinematheque.js`, `ticketmaster.js` | One self-contained scraper per supported event site, with hardcoded selectors + inline host matcher |
| `extension/event-extractors/extract-unsupported.js` | `GCal.unsupportedSiteEvents`: the fallback extractor for hosts with no source — best-effort event (embedded JSON-LD + generic heuristics); the popup shows it when complete (title + location + start) and the host isn't denylisted, else uses it to seed the source-request form |
| `extension/events-popup/build-calendar-url.js` | Builds the pre-filled Google Calendar template URL (incl. markdown→HTML for details) |
| `extension/event-extractors/assemble-events.js` | Orchestrator `GCal.extract()`: runs the matched self-contained source, else the unsupported-site fallback; normalizes/sorts events and reports `supported` |
| `extension/event-extractors/load-order.generated.json` | Generated injection order (`npm run index`); single source of truth |
| `dev/requirements/extractor/expected/`   | Reviewed live-test cases (`description` + expected values), one JSON each |
| `dev/requirements/extractor/data/` | Per-case cached HTML (`<name>.html`) the live tests assert against, each paired with its source URL (`<name>.url`); split by provenance into `server-fetched/` (pipeline-recorded, secret-scan-excluded) and `user-submitted/` (hand-supplied, push-protected), resolved by `data-files.js` |
| `dev/create-extractor/phase1-prepare.sh` | Records the event page via an inline curl→ScraperAPI (`scraperapi_fetch`) during the auto-extractor Phase-1 pipeline |
| `dev/requirements/extractor/live.test.js` | Runs the reviewed assertions against the cached HTML files |
| `extension-test/event-extractors/extraction.test.js`, `extension-test/events-popup/build-calendar-url.test.js` | Internal offline unit tests |
| `extension-test/harness.js` | Shared test harness (loads the pipeline files into a jsdom DOM and runs `GCal.extract()`) |
| `dev/requirements/extractor/fallback/fallback-coverage.js` | Compares the generic fallback to each dedicated source across the cached cases (the coverage gate's logic + the report renderer) |
| `dev/requirements/extractor/fallback/fallback-coverage.test.js` | High-watermark gate on the fallback's field coverage vs. the dedicated sources; refreshes `dev/requirements/extractor/fallback/fallback-coverage.GENERATED.md` and ratchets the baseline locally |
| `dev/requirements/extractor/fallback/fallback-coverage.baseline.GENERATED.json` | Stored high-watermark percentages the coverage gate asserts against (test-rewritten; `GENERATED` in the name flags it — don't hand-merge) |
| `dev/requirements/extractor/fallback/fallback-coverage.GENERATED.md` | Generated report: what the fallback recovers vs. the dedicated sources, per host / field type / case |
| `dev/requirements/<kind>/cases/<name>.case.js` | One UI snapshot case: fake data (`{ description, data, listing?, tab?, action? }`) fed to the popup's real `render()`. Its scenario lives only here — no shared gallery |
| `dev/requirements/<kind>/cases/<name>.png` | Committed reference image for the matching case, browsable on GitHub |
| `dev/requirements/shared/render/actions.js` | Reusable `(document) => void` case gestures (e.g. `scrollToBottom`, which pins `#events` so satori paints the bottom) |
| `dev/requirements/shared/render/popup-renderer.js` | Builds each popup case's DOM via the popup's real `render()` and rasterizes to PNG (satori + resvg, no browser), inlining the real `extension/events-popup/popup.css` first; prunes off-screen list rows so resvg doesn't choke on a tall SVG |
| `dev/requirements/shared/render/icon-renderer.js` | Generates the toolbar icon for a tab URL by loading the real `extension/icon/toolbar-icon.js` into a fake browser and reading back the `ImageData` it bakes; the renderer behind a `kind: "icon"` snapshot case |
| `dev/requirements/shared/render/fake-chrome.js` | The fake browser (`chrome.*` + `fetch`/`OffscreenCanvas`) that `icon-renderer.js` loads `extension/icon/toolbar-icon.js` into, then queries "what icon at this URL?" |
| `dev/requirements/shared/render/render-snapshot.js` | One dispatcher: renders a snapshot case to PNG via the popup renderer or the icon renderer, chosen by the case's kind — the folder it lives in (`popup/` or `icon/`) |
| `dev/requirements/shared/snapshot-artifacts-dir.js` | Path of the gitignored dir the UI tests write `.actual.png`/`.diff.png` to on a mismatch |
| `dev/requirements/shared/render/fonts/` | Bundled Liberation Sans font files used by the renderer (OFL-licensed) |
| `dev/requirements/shared/render/visual-snapshots.test.js` | The single visual-comparison engine: renders each `dev/requirements/<kind>/cases/*.case.js` (popup or toolbar icon) and compares it to its stored snapshot |
| `dev/requirements/shared/render/refresh-snapshots.js` | Regenerates the `dev/requirements/<kind>/cases/*.png` snapshots (popup and icon) + the inline gallery |
| `dev/build/release/store_artifacts/generate_icons.py` | Regenerates every icon into `extension/icon/images/` (Python stdlib only): the small flat toolbar glyphs `icon{16,32}*.png` (base + supported/denied state variants) and the polished calendar art at the larger sizes — `chromeStoreIcon.png` (manifest 128px icon, also uploaded by hand as the Web Store listing icon) and `chromeExtensionManagementIcon.png` (48px management page). See `dev/build/release/store_artifacts/README.md` |
| `dev/build/release/shipping-files.js` | Single source of truth for the files that ship in the release zip |
| `dev/build/release/build-zip.js` | Builds `dist/google-calendar-event-creator.zip` (`npm run build`) from the shipping list |
| `dev/create-extractor/` | The auto-implement-extractor pipeline in one folder: the self-contained agent prompt, the deterministic Node steps (triage, probe, naming, derive-names, scaffold-source/case, add-supported-domain, case-quality), and the workflows' phase scripts (`phase1-prepare.sh`, `handoff-to-agent.sh`, `phase2-finalize.sh`). A three-stage label relay: prepare workflow → Claude Code web routine → finalize workflow. See `dev/create-extractor/auto-extractor.md` |
| `dev/create-extractor/triage-extractor-request.js` | Auto-extractor pre-flight: detects a request whose host is already allow/denylisted so the workflow can close it before the agent runs |
| `dev/incremental-maintenance/` | Specs for the unattended daily routines that incrementally improve the shipped extractor over time. Currently `auto-fallback-coverage.md` — the routine that tries to widen the generic fallback extractor's field coverage (the gate itself lives under `dev/requirements/extractor/fallback/`) |
| `dev/requirements/shared/gen-states-flowchart.js` | Regenerates `dev/requirements/shared/popup-states-flowchart.png` (the five-states diagram) via an SVG + resvg |
| `dev/build/release/shipping-files.test.js` | Asserts the shipping list covers every runtime file and excludes dev/test files |
