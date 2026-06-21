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
- **The UI coverage gate is SEGMENTED by what each requirement needs (issue
  #429).** The UI requirements are enumerated in `docs/uiRequirements.md` (`1.1`,
  `5.6.1`, …) and split by the verification each needs:
  - A **render** leaf is pinned by exactly one **per-leaf** UI snapshot case,
    named `req-<id>.case.js` → `req-<id>.png` (the *filename* is the link), whose
    image is shown in a **two-column table** beside the requirement (image left,
    spec right) in `docs/uiRequirements.md` by
    `test/ui/build-requirements-gallery.js`. The gate enforces a strict
    one-case-per-leaf bijection: a render leaf with no case (or two) fails. **How
    the PNG is rendered is the CASE's choice, not a spec kind**: a case declares its
    own `kind` (default `"popup"` — the popup's real `render()` via
    `test/ui/popup-renderer.js`; or `"icon"` — the real `ui/toolbar-icon.js` loaded
    into a fake browser, `test/ui/icon-renderer.js` + `test/ui/fake-chrome.js`, fed
    the case's faked tab URL + host lists). `test/ui/render-snapshot.js` is the one
    dispatcher that picks the renderer by the case's `kind`, shared by the snapshot
    test and the refresh script — so there is ONE visual-comparison system, and the
    toolbar icon (§10) is just render leaves whose cases set `kind: "icon"`.
  - A **behavior** leaf (tagged `_(behavior)_` in the spec — a click/navigation a
    static image can't observe, e.g. `9.1`–`9.3`, `3.4`) is routed to a behavior
    test (`test/unit/events-view-actions.test.js`) via the manifest
    `test/ui/behavior-coverage.js`. A `req-<id>` snapshot may **not** exist for one
    — that was the #429 anti-pattern (a PNG "covering" a click it can't see).
  - A **TBD** leaf (tagged `_(TBD)_` — an edge case whose behavior isn't decided
    yet, e.g. `4.2.3`, `4.10`, `5.7.3`) is a placeholder: rendered with a "TO BE
    DECIDED" banner and **exempt** from the bijection (it may carry a *provisional*
    `req-<id>` snapshot of current behavior, but isn't required to). The
    edge-case-review routine (#438) is what fills these in over time.

  `test/uber/ui-requirements-coverage.test.js` fails unless **every leaf is
  covered by the right kind** (and rejects a nonexistent/typo'd/duplicate case, or
  a snapshot for a behavior leaf). A render case earns its keep by pinning a
  requirement's correct rendering — confirmed by a human against the PNG, not "can
  these pixels be generated?". The popup's pure logic stays pinned by unit tests
  (`popup-content` / `events-view` / `popup-truncation`).

  **⚠️ This verification is deliberately INCOMPLETE — tracked in #435.** Every leaf
  is *claimed* by the right kind of test, but the behavior test **stubs**
  `chrome.tabs.create`/`window.close` — so it confirms our code *asks* for the
  right action, not that a real Chrome performs it. A faithful (non-stub)
  verification of the `_(behavior)_` leaves is still owed (the owner will address
  it separately). A loud banner in `docs/uiRequirements.md` says the same: a green
  build means every leaf is *claimed*, not that every leaf is *faithfully*
  verified.

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
  selector specificity), the tall-list clamp, and the `skipRender` initial-shell
  case are in `test/ui/popup-renderer.js`; the pixel-exact diff
  (`MAX_DIFF_RATIO = 0`) and the en-US-locale guard are in
  `test/ui/popup-snapshots.test.js`; the scroll/fade gestures are in
  `test/ui/actions.js`. A case is a self-contained per-leaf `req-<id>.case.js`
  (fake data + an optional DOM action) + `req-<id>.png`; `test/ui/render-snapshot.js`
  picks the renderer by the case's own `kind` (default `"popup"` → the popup's REAL
  `render()`; `"icon"` → the real `ui/toolbar-icon.js` in a fake browser,
  `icon-renderer.js` + `fake-chrome.js`), so a view or icon change moves the
  snapshots automatically. After an intentional popup/view/CSS or toolbar-icon
  change run `npm run refresh:ui` and commit the PNGs + inline gallery
  (deterministic, no CI workflow). The requirement list — and each leaf's
  spec-level **kind** (render / `_(behavior)_` / `_(TBD)_`) — is parsed from
  `docs/uiRequirements.md` by `test/ui/ui-requirements.js`, shared with the coverage
  ubertest (`test/uber/ui-requirements-coverage.test.js`); the render-vs-icon
  renderer split is the case's `kind`, not a spec kind.
- **Behavior verification** — `test/unit/events-view-actions.test.js` drives the
  clicks the snapshots can't (the `_(behavior)_` leaves: a card / instance button
  / affordance link opens an adjacent new tab and closes the popup), routed to it
  by the manifest `test/ui/behavior-coverage.js`. It **stubs** the
  `chrome.tabs.create`/`window.close` boundary, so it's explicitly INCOMPLETE (a
  loud banner in the file; a faithful non-stub verification is owed in #435).
- **Two-column requirements gallery** — `test/ui/build-requirements-gallery.js`
  lays each leaf out as an HTML `<table>` row in `docs/uiRequirements.md`: the
  generated `req-<id>.png` (or a behavior-test note) in the **left** cell, the
  hand-authored requirement in the **right** cell. GitHub renders the markdown in
  each `<td>` because the cell content is blank-line-separated. The generator
  rewrites **only** the managed left-cell line — tagged `<!-- req-gallery:<id> -->`
  — never the scaffolding or prose, so `docs/uiRequirements.md` is
  part-generated/part-authored and is **not** on the `ours` merge driver (a prose
  conflict is resolved by hand; the left cells regenerate via `npm run regen`).
  Gated by `test/ui/requirements-gallery.test.js` (refresh-then-gate locally,
  read-only in CI; plus a check that every leaf has exactly one marker). This
  requirement-first gallery **replaced** the old case-first `test/ui/README.md`
  (since removed).
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
