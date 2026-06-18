# Testing

`npm test` runs everything. General test discipline — see a test fail before
trusting it, green-twice-before-merge, snapshot-through-the-real-code-path,
high-watermark gating, self-diagnosing remote tests — lives in
`docs/engineeringPractices.md`; jsdom-vs-Chrome traps live in
`docs/technicalGotchas.md`. This file is the project-specific testing decisions
that aren't tied to one file. The detailed mechanics of each test harness live as
comments **in that harness** (linked below), not here — edit the comment, not this
doc, when the mechanics change.

## Project testing decisions

- **Integration cases are the reviewed contract.** A person reads
  `test/extractors/custom/` to confirm the behavior is right; nobody reviews the
  unit tests. So every required change or bugfix must be covered by an
  integration case — add or update one whenever you add/change support for a
  site or fix an extraction bug (one real, focused event page per distinct
  behavior). Unit tests (`test/unit/`) are a supplementary safety net for logic
  that doesn't depend on a third-party page (date math, URL building, parsing),
  not a substitute.
- **Keep integration cases as simple as possible.** This matters a lot, because
  they're what gets reviewed: minimal, representative pages; no incidental
  complexity; one behavior per case rather than sprawling catch-alls.
- **To see what the generic/unsupported extractor gets** on any cached page —
  even a supported host — load the files, set `GCal.sources = []`, then call
  `GCal.extract()`: that forces the unsupported-host path through the same
  norm/sort the popup uses, no parallel harness needed. When comparing its
  output to a dedicated source, most start/end *differences* are just the
  dedicated source localizing to floating time via its hardcoded `ctz` (same
  instant), not extraction bugs; the real gaps are missing fields (`ctz`,
  durations, site-specific descriptions) it can't know generically. (This is the
  same comparison the fallback-coverage gate automates — see below.)
- **A UI snapshot verifies pixels, not logic — so before pruning a snapshot case,
  audit the distinct *visual* it uniquely shows.** The popup's behavior is already
  covered by unit tests (`popup-content` / `events-view` / `popup-truncation`), so
  each `test/ui/cases/` image earns its keep by a visual treatment no other case
  shows — a time-range inside a chip, a wrapping chip row, one event splitting into
  month + same-day + single cards, the count cue counting instances not cards.
  Slimming the set by deduping *logic* silently drops those visuals while every
  unit test stays green. Reorganize by feature (all of a feature's variations in
  one image, named scenario→expectation), but treat each removal as a coverage
  question, not a dedupe.

## Adding a cached integration case

New cached HTML can't be fetched here (the sandbox is bot-blocked — see
`docs/technicalGotchas.md`), so record the cached HTML *before* writing the case
and read its exact `expected` off the committed file instead of guessing:

1. Commit two new files — but **not** the case file yet:
   - `data/<name>.html` — an empty (zero-byte) file; the empty file is the
     "fetch me" signal for the refresh script.
   - `data/<name>.url` — a plain-text file containing just the event page URL
     (e.g. `https://www.meetup.com/.../`). This file stays for good: it's the
     single source of truth for the page's URL (used by the refresh script and
     by `live.test.js`), so the URL is **not** repeated in the case file.
2. Push the branch. The **Refresh cached HTML files** workflow runs
   automatically (the push adds a `data/` file), fills in the empty
   `data/<name>.html`, and commits it back to the branch; `test:live` stays
   green because no case asserts it yet.
3. Pull, then add `test/extractors/custom/<name>.json` (same `<name>`, just
   `description` + `expected`, no `url`) and run `npm run test:live` — it now
   runs against the local cached HTML, so its output gives you the exact
   `expected` to paste in. Commit and push.

## Where each test harness documents itself

These harnesses are self-documenting: the *why* of every non-obvious decision
lives in the file's own header/inline comments, so it can't drift from the code.
Read the file when you touch it; the one-liners here are just a map.

- **Fallback-coverage gate** — `test/extractors/fallback/fallback-coverage.js`
  (the field-by-field comparison) and `fallback-coverage.test.js` (the
  high-watermark gate over a changing case set, #240). Runs in `test:live`;
  rewrites `fallback-coverage.GENERATED.md` locally and is read-only in CI.
  Adding an extractor never fails it.
- **UI snapshots** — the renderer's satori/resvg limits, CSS inlining (no
  selector specificity), and the tall-list clamp are in
  `test/ui/popup-renderer.js`; the pixel-exact diff (`MAX_DIFF_RATIO = 0`) and
  the en-US-locale guard are in `test/ui/popup-snapshots.test.js`; the
  scroll/fade gestures are in `test/ui/actions.js`. After an intentional
  popup/view/CSS change run `npm run refresh:ui` and commit the PNGs (the change
  author regenerates on their branch — it's deterministic, no CI workflow). A
  case is a self-contained `<name>.case.js` (fake data only) + `<name>.png`; the
  renderer feeds it the popup's REAL `render()`, so a view change moves the
  snapshots automatically.
- **UI snapshot gallery** — `test/ui/README.md` is GENERATED from the cases
  (`test/ui/build-readme.js`, gated by `readme.test.js`); never hand-edit it.
  It's named plain `README.md` (not `*.GENERATED.md`) so GitHub renders it as the
  folder landing page — the do-not-edit banner + CI gate stand in for the missing
  cue.
- **"Does the extension load?"** is guarded in two layers:
  `test/extension/extension-loads.test.js` (always-on, no browser — boots the
  service worker through a Chrome-faithful `importScripts` and checks every
  injected/manifest file, #146) and
  `test/fullBrowserHeavyTests/extension-load.chrome.test.js` (`npm run test:e2e` —
  the real unpacked extension under Chrome for Testing; skips without
  `CHROME_PATH`, so verify changes to it via CI).
- **SPA-shell render fallback** (#310, #328) — the detector (`data/spa-shell.js`,
  `shouldRender = isSpaShell && !hasEventData`, keying on a machine start date)
  is pure and unit-tested
  offline in `test/unit/spa-shell.test.js`; the headless render itself
  (`data/render-page.js`, sharing the DevTools client `data/cdp-client.js` with
  the extension-load test) is exercised by
  `test/fullBrowserHeavyTests/render-page.chrome.test.js` against a self-authored
  `data:` URL — CI-only, skips without `CHROME_PATH`. The recorder
  (`data/refresh-cache.js`) calls the render only when the plain fetch returns a
  data-less SPA shell, and keeps it only if it gained extractable data;
  `refresh-cache.yml` wires `CHROME_PATH` so this happens when recording.
