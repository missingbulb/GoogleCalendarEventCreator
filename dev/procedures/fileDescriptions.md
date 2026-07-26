# File descriptions

A per-file map of the repo. See [highLevelDesign.md](highLevelDesign.md) for how
extraction works (the architecture rules of the road live in the gcec local
pack's [RULES.md](../../.claudinite/local/packs/gcec/RULES.md)), and
[requirements.md §12–§16](../requirements/requirements.md) for what the
extension does.

| File            | Purpose                                                       |
| --------------- | ------------------------------------------------------------- |
| `extension/manifest.json` | Manifest V3 definition (`activeTab` + `scripting` + `declarativeContent` permissions) |
| `extension/config.js` | Tunable product decisions (durations, the event cap, the unsupported-host allow/denylist); imported by the popup modules |
| `extension/host-policy.js` | The host classifier (`classifyHost`, `isSupportedDomain`) + the presentability gate for a scraped event, shared by the popup and the auto-extractor triage |
| `extension/events-popup/popup.html`, `extension/events-popup/popup.css`, `extension/events-popup/popup.js` | Toolbar popup: controller that runs the extractor, picks a view (`chooseContent`), and renders it (markup + extracted styles) |
| `extension/events-popup/events-view.js` | Renders one card per event — a clickable button for a single occurrence, or a grouped card with a button per showing for a multi-instance event (loaded on demand via `import()`) |
| `extension/events-popup/source-request-view.js` | The unsupported-host affordances (loaded on demand): "Suggest Correction" (opens the prefilled GitHub issue) and "Disagree?" (expands the `POLICY_EXPLANATION` "how this works" text inline in the popup, with an "open an issue" link) |
| `extension/icon/toolbar-icon.js` | Background service worker: registers `chrome.declarativeContent` rules (from `host-lists.json`) so the browser colors the toolbar icon by host pattern — green on supported hosts, gray on denylisted ones, blue elsewhere — without the extension reading any tab URL |
| `extension/event-extractors/registry.js` | Bootstraps `GCal`, the `GCal.sources` registry, and `isSupportedHost` |
| `extension/event-extractors/helpers/` | Shared utilities any extractor may use, split by concern: DOM, text (rich-text/`htmlToText`/`parts`), dates, timezones, timezone-names, merge, and `embedded-events` (the `GCal.embeddedEvents` schema.org JSON-LD reader) |
| `extension/event-extractors/generic-extractor.js` | `GCal.genericExtractor`: THE core generic extractor, run on every page — best-effort event (embedded JSON-LD + generic heuristics over meta tags, microdata, `<time>`, and visible text). It is the base layer every per-site source overrides, the only extractor on an unsupported host, and the whole of the support for a site with no per-site file |
| `extension/event-extractors/custom/meetup.js`, `eventbrite.js`, `edinburghfringe.js`, `telavivcinematheque.js`, `ticketmaster.js`, … | One per site the generic extractor gets wrong: hardcoded selectors + inline host matcher, stating ONLY the fields it overrides (or its own enumerated `events`) |
| `extension/events-popup/build-calendar-url.js` | Builds the pre-filled Google Calendar template URL (incl. markdown→HTML for details) |
| `extension/event-extractors/assemble-events.js` | Orchestrator `GCal.extract()`: runs the core generic extractor for the base events and merges the matched site source's overrides over them; normalizes/sorts events and reports `sourceMissed` |
| `extension/event-extractors/load-order.generated.json` | Generated injection order (`npm run index`); single source of truth |
| `dev/requirements/extractor/expected/`   | Reviewed live-test cases (`description` + expected values), one JSON each |
| `dev/requirements/extractor/data/` | Per-case cached HTML (`<name>.html`) the live tests assert against, each paired with its source URL (`<name>.url`); split by provenance into `server-fetched/` (pipeline-recorded, secret-scan-excluded) and `user-submitted/` (hand-supplied, push-protected), resolved by `data-files.js` |
| `.claudinite/local/packs/gcec/tasks/create-extractor/prepare.mjs` | The create-extractor task's preprocessing worker: triage + close, branch, scaffold, prove a green offline baseline, **record the page through ScraperAPI**, push, open the draft PR, and request the agent only if an `extract()` is left to write |
| `.claudinite/local/packs/gcec/scraperapi.mjs` | The project's one page-fetching surface — a rendered ScraperAPI fetch, usable only from a task's preprocessing worker (the only stage the `SCRAPER_API_KEY` Actions secret reaches) |
| `dev/requirements/extractor/live.test.js` | Runs the reviewed assertions against the cached HTML files |
| `extension-test/event-extractors/extraction.test.js`, `extension-test/events-popup/build-calendar-url.test.js` | Internal offline unit tests |
| `extension-test/harness.js` | Shared test harness (loads the pipeline files into a jsdom DOM and runs `GCal.extract()`) |
| `dev/requirements/extractor/generic-coverage/generic-coverage.js` | Compares the generic extractor to each dedicated source across the cached cases (the coverage gate's logic + the report renderer) |
| `dev/requirements/extractor/generic-coverage/generic-coverage.test.js` | High-watermark gate on the generic extractor's own field coverage vs. the dedicated sources; refreshes `dev/requirements/extractor/generic-coverage/generic-coverage.GENERATED.md` and ratchets the baseline locally |
| `dev/requirements/extractor/generic-coverage/generic-coverage.baseline.GENERATED.json` | Stored high-watermark percentages the coverage gate asserts against (test-rewritten; `GENERATED` in the name flags it — don't hand-merge) |
| `dev/requirements/extractor/generic-coverage/generic-coverage.GENERATED.md` | Generated report: what the generic extractor recovers alone vs. the dedicated sources, per host / field type / case |
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
| `.claudinite/local/packs/gcec/tasks/create-extractor/` | The create-extractor task in one folder: `task.mjs` (declaration + the pure eligibility precondition), `prepare.mjs` (all the deterministic work, including the pending-page sweep), `task.md` (the agent's judgment-only spec), `postconditions.sh` (scope + quality + re-verify), and the helpers they call — `triage.js`, `resolve-source.js`, `extractor-naming.js`, `scaffold.js`, `case-quality.js`, `attach-sample-url.js`, `repo-root.js` |
| `.claudinite/local/packs/gcec/tasks/create-extractor/triage.js` | Routes a request by running the sources' real `matches()` + the popup's `classifyHost` (supported → add-a-case · deny/allow/sample → close · else → new source) and computes every mode-aware name. Pure and offline; `prepare.mjs` owns the GitHub I/O around it |
| `.claudinite/local/packs/` | This repo's own Claudinite pack (tracked project content, run by the same engine as the canon): `gcec/` — the project's standing rules (`RULES.md`), its own conformance checks, and its working skills (snapshot-approval / merge-and-ci / testing-guide) |
| `.claudinite/local/packs/gcec/tasks/create-extractor/task.mjs` | The task declaration + precondition (per-project-scheduling §1): frequency `hourly`, model `sonnet`, outcome `open-pr`, `agent_preprocessing: node prepare.mjs` and `required_secrets: ['SCRAPER_API_KEY']`. The precondition is eligibility only — pure code over the `issues` signal, no I/O and no writes |
| `.claudinite/local/packs/gcec/tasks/generic-extractor-improvements/task.mjs` | The task declaration + precondition (per-project-scheduling §1): frequency `weekly`, model `opus`, outcome `open-pr`; the precondition is the old freshness gate, now pure code over the `commits` signal (fires only on a substantive change) |
| `.claudinite/local/packs/gcec/tasks/generic-extractor-improvements/task.md` | The agentic worker spec: measure the baseline, iterate on one or more generic wins, validate, finalize. The measure→edit→re-measure loop and the genericity/trap constraints live here; the scheduler runs the precondition, so the worker starts from "a meaningful change landed" |
| `.claudinite/local/packs/gcec/tasks/generic-extractor-improvements/postconditions.sh` | Post-work validation of a candidate win: diff-scope, full `npm test`, a real improvement over the committed baseline, and (per value arg) the jsdom-artifact check. Any non-zero exit means the run failed and must not retry or open a PR |
| `dev/build/release/shipping-files.test.js` | Asserts the shipping list covers every runtime file and excludes dev/test files |
