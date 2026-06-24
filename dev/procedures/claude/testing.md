# Testing

`npm test` runs everything. General test discipline — see a test fail before
trusting it, green-twice-before-merge, snapshot-through-the-real-code-path,
high-watermark gating, self-diagnosing remote tests — lives in
`dev/procedures/engineeringPractices.md`; jsdom-vs-Chrome traps live in
`dev/procedures/technicalGotchas.md`. This file is the project-specific testing decisions
that aren't tied to one file. The detailed mechanics of each test harness live as
comments **in that harness** (linked below), not here — edit the comment, not this
doc, when the mechanics change.

## Project testing decisions

- **`extension-test/` mirrors `extension/`'s tree, one test per source file.**
  A source file `extension/<area>/<name>.js` is tested by
  `extension-test/<area>/<name>.test.js` — same relative path, `.test.js`
  suffix (e.g. `extension/events-popup/events-view.js` →
  `extension-test/events-popup/events-view.test.js`). The path **is** the
  link, so a source file never names its own test in a comment. Two deliberate
  departures from a literal mirror:
  - **`extension-test/integration/`** holds tests that exercise an *interaction*
    or the *whole extension* rather than a single source file — the
    whole-extension load smoke (`extension-loads`), the GCal-assembly
    order/idempotency tests (`load-order`, `registry-idempotent`), and the
    `supportedDomains`↔sources drift guard (`supported-domains`).
  - **No mirror for `custom/*` sources or data/markup files.** Per-site
    extractors are validated by the reviewed integration cases under
    `dev/requirements/extractor/` (not unit tests here); `popup.html`/`.css`,
    `manifest.json`, `fallback-lists.json`, and the generated load list are
    covered by the UI snapshots / load-order drift guard elsewhere. So the
    mirror is *almost* identical, not identical.
  `extension-test/harness.js` is shared infra (not a test) and stays at the
  root. `npm test` discovers tests by glob (`extension-test/**/*.test.js`); the
  explicit `test:offline` list in `package.json` must be kept in sync when a
  test file is added, moved, or removed.

- **Integration cases are the reviewed contract.** A person reads
  `dev/requirements/extractor/expected/` to confirm the behavior is right; nobody reviews the
  unit tests. So every required change or bugfix must be covered by an
  integration case — add or update one whenever you add/change support for a
  site or fix an extraction bug (one real, focused event page per distinct
  behavior). The unit tests under `extension-test/` are a supplementary safety net for logic
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
- **All requirements live in `dev/requirements/`.** The spec docs and
  every validating test are in that one top-level folder; the document model and
  the how-to-add-one rules are in
  [dev/requirements/README.md](../../requirements/README.md).
  The notes below are the project decisions behind that model.
- **Every leaf is verified by exactly one CASE, and its KIND is the folder it lives
  in (issue #429, #435).** The spec (`dev/requirements/requirements.md`) is just
  numbered prose; it does NOT tag how a leaf is verified. Each leaf has exactly one
  `<kind>/cases/<slug>.<id>.case.js` (the *filename* names the leaf — `<slug>` is the
  section's component name, `<id>` the dotted leaf number; the **folder** names the
  kind, so the case module carries no `kind` field), plus an optional `tbd` flag.
  `dev/requirements/shared/kinds.js` auto-discovers the kinds and
  `dev/requirements/shared/render/render-snapshot.js` turns an image case into a PNG
  by its kind (only the image kinds have a renderer) — so there is ONE routing system
  across visual and non-visual leaves:
  - **popup** (default) — an image leaf, the popup's real `render()` via
    `dev/requirements/shared/render/popup-renderer.js`, pinned by a `<slug>.<id>.png` snapshot shown in a
    **two-column table** beside the requirement (image left, spec right) in
    `dev/requirements/requirements.md` by `dev/requirements/shared/build-requirements-gallery.js`.
  - **icon** — an image leaf too, but rendered by the real
    `extension/icon/toolbar-icon.js` loaded into a fake browser (`dev/requirements/shared/render/icon-renderer.js` +
    `dev/requirements/shared/render/fake-chrome.js`), fed the case's faked tab URL + host lists (the
    toolbar icon, §10).
  - **behavior** — a click/navigation a static image can't observe (e.g.
    `9.1`–`9.3`, `3.4`); the case carries NO image and is verified by
    `dev/requirements/behavior/events-view-actions.test.js` (which self-asserts it covers exactly
    the behavior-folder cases). A `<slug>.<id>.png` for one is the #429 anti-pattern
    and the gate rejects it.
  - **extractor** — a non-image leaf (§11, "Required explicit support for
    Extractors"): one per supported host, validated by running the real per-site
    extractor against a real cached page (`dev/requirements/extractor/data/<page>.html`)
    and asserting the host is recognized as supported and yields a complete event.
    Verified by `dev/requirements/extractor/extractor-support.test.js`; the
    case names `{ host, source, page }`. A bot-blocked host with no cacheable page
    (facebook) is a `tbd` extractor case (unit-tested only).
  - **logic** — a non-image, non-visual product/behavior leaf (§12–§16, the
    rules converted from `productRequirements.md`). A wired case carries an
    executable `verify()` run by `dev/requirements/logic/product-requirements.test.js`;
    a `tbd` logic case is tracked-but-not-wired and names the unit test that covers
    it today (`coveredBy`).
  - `tbd: true` — a leaf not (yet) faithfully verified here: an image edge case
    whose behavior isn't decided yet still renders a provisional snapshot under a
    "TO BE DECIDED" banner (none at present — `4.2.3`/`4.10` were resolved into the
    date-range chip); a non-image `tbd` case (extractor/logic) is reported skipped
    with a pointer to its current coverage. The edge-case-review routine (#438)
    resolves the image ones over time.

  `dev/requirements/requirements-coverage.test.js` fails unless **every leaf has exactly
  one case** (and rejects a nonexistent/typo'd/duplicate case, an unknown `kind`, or
  a non-image case — behavior/extractor/logic — that smuggled in a PNG). A case earns its keep by pinning a
  requirement's correct rendering/behavior — confirmed by a human against the PNG,
  not "can these pixels be generated?". The popup's pure logic stays pinned by unit
  tests (`events-popup/popup` / `events-popup/events-view`).

  **⚠️ This verification is deliberately INCOMPLETE — tracked in #435.** Every leaf
  is *claimed* by the right kind of test, but the behavior test **stubs**
  `chrome.tabs.create`/`window.close` — so it confirms our code *asks* for the
  right action, not that a real Chrome performs it. A faithful (non-stub)
  verification of the `kind: "behavior"` leaves is still owed (the owner will address
  it separately). A loud banner in `dev/requirements/requirements.md` says the same: a green
  build means every leaf is *claimed*, not that every leaf is *faithfully*
  verified.
- **A requirement case's verification KIND has exactly one classifier — and here it's
  the folder the case lives in.** The spec prose must not tag how a leaf is verified,
  and there must be no side manifest keyed by id; one source of truth means a case
  can't desync from its classifier. This repo first folded the `_(icon)_` /
  `_(behavior)_` / `_(TBD)_` spec tags and a behavior-coverage manifest into a
  per-case `kind` field, then removed even that field: a case now lives under
  `<kind>/cases/`, so the **folder is the single classifier** and adding a kind is a
  self-contained folder drop (`<kind>/kind.js`, auto-discovered by
  `dev/requirements/shared/kinds.js`). The lesson generalizes: collapse parallel
  classifiers to one, and prefer a structural classifier (location) the code can't
  desync from over a hand-set field.
- **Requirement tests render against a pinned reference "now", not the real clock.**
  The popup's only date-dependent output is the card corner-pill (`events-view.js`
  `cornerPill` — a gray "past" pill for an event before today, a green year pill for
  a future year, none for a current/upcoming date), so a single pinned instant
  (`dev/requirements/shared/reference-time.js` `REFERENCE_NOW`, currently 2026-06-01)
  is threaded as `render({ now })` into every test entry point (the snapshot renderer
  and the behavior test) so date-bearing snapshots stay deterministic forever instead
  of rotting as the wall clock advances. **The pinned day is the floor of the cases'
  dates: author a neutral/upcoming case on or after it (≥ 2026-06-01) so it's
  pill-free** — an earlier date renders a "past" pill it didn't intend; use a past
  date (earlier in 2026, or a prior year) or a future year only when the case is
  *pinning* a pill (5.6.1/5.6.4 past, 5.6.2 future, 5.6.3 none).

## Adding a cached integration case

New cached HTML can't be fetched here (the sandbox is bot-blocked — see
`dev/procedures/technicalGotchas.md`), so record the cached HTML *before* writing the case
and read its exact `expected` off the committed file instead of guessing:

1. Commit two new files — but **not** the case file yet:
   - `dev/requirements/extractor/data/<name>.html` — an empty (zero-byte) file; the empty file is the
     "fetch me" signal for the refresh script.
   - `dev/requirements/extractor/data/<name>.url` — a plain-text file containing just the event page URL
     (e.g. `https://www.meetup.com/.../`). This file stays for good: it's the
     single source of truth for the page's URL (used by the refresh script and
     by `live.test.js`), so the URL is **not** repeated in the case file.
2. Push the branch. The **Refresh cached HTML files** workflow runs
   automatically (the push adds a `data/` file), fills in the empty
   `dev/requirements/extractor/data/<name>.html`, and commits it back to the branch; `test:live` stays
   green because no case asserts it yet.
3. Pull, then add `dev/requirements/extractor/expected/<name>.json` (same `<name>`, just
   `description` + `expected`, no `url`) and run `npm run test:live` — it now
   runs against the local cached HTML, so its output gives you the exact
   `expected` to paste in. Commit and push.

## Where each test harness documents itself

These harnesses are self-documenting: the *why* of every non-obvious decision
lives in the file's own header/inline comments, so it can't drift from the code.
Read the file when you touch it; the one-liners here are just a map. (This same
co-location applies to **any** file-local footgun, not just harness mechanics — a
commission-while-editing trap goes in the file's header comment rather than
`dev/procedures/technicalGotchas.md`; see the locality rule in
[workflow.md](workflow.md).)

- **Fallback-coverage gate** — `dev/requirements/extractor/fallback/fallback-coverage.js`
  (the field-by-field comparison) and `fallback-coverage.test.js` (the
  high-watermark gate over a changing case set, #240). Runs in `test:live`;
  rewrites `fallback-coverage.GENERATED.md` locally and is read-only in CI.
  Adding an extractor never fails it.
- **UI snapshots** — the renderer's satori/resvg limits, CSS inlining (no
  selector specificity), the tall-list clamp, and the `skipRender` initial-shell
  case are in `dev/requirements/shared/render/popup-renderer.js`; the pixel-exact diff
  (`MAX_DIFF_RATIO = 0`) and the en-US-locale guard are in
  `dev/requirements/shared/render/visual-snapshots.test.js`; the scroll/fade gestures are in
  `dev/requirements/shared/render/actions.js`. A case is a self-contained per-leaf `<slug>.<id>.case.js`
  (fake data + an optional DOM action) + `<slug>.<id>.png`; `dev/requirements/shared/render/render-snapshot.js`
  picks the renderer by the case's kind — its folder (`popup/` → the popup's REAL
  `render()`; `icon/` → the real `extension/icon/toolbar-icon.js` in a fake browser,
  `icon-renderer.js` + `fake-chrome.js`), so a view or icon change moves the
  snapshots automatically. After an intentional popup/view/CSS or toolbar-icon
  change run `npm run refresh:ui` and commit the PNGs + inline gallery
  (deterministic, no CI workflow). The requirement list is parsed from
  `dev/requirements/requirements.md` by `dev/requirements/shared/ui-requirements.js` (numbers only — it does
  NOT classify leaves), shared with the coverage ubertest
  (`dev/requirements/requirements-coverage.test.js`); how each leaf is verified
  (`popup` / `icon` / `behavior` / `tbd`) is the case's **folder** (its kind) + `tbd`,
  not a spec tag.
- **Behavior verification** — `dev/requirements/behavior/events-view-actions.test.js` drives the
  clicks the snapshots can't (the `kind: "behavior"` leaves: a card / instance
  button / affordance link opens an adjacent new tab and closes the popup); it reads
  the cases and self-asserts it covers exactly those leaves. It **stubs** the
  `chrome.tabs.create`/`window.close` boundary, so it's explicitly INCOMPLETE (a
  loud banner in the file; a faithful non-stub verification is owed in #435).
- **Two-column requirements gallery** — `dev/requirements/shared/build-requirements-gallery.js`
  lays each leaf out as an HTML `<table>` row in `dev/requirements/requirements.md`: the
  generated `<slug>.<id>.png` (or a behavior-test note) in the **left** cell, the
  hand-authored requirement in the **right** cell. GitHub renders the markdown in
  each `<td>` because the cell content is blank-line-separated. The generator
  rewrites **only** the managed left-cell line — tagged `<!-- req-gallery:<id> -->`
  — never the scaffolding or prose, so `dev/requirements/requirements.md` is
  part-generated/part-authored and is **not** on the `ours` merge driver (a prose
  conflict is resolved by hand; the left cells regenerate via `npm run regen`).
  Gated by `dev/requirements/shared/requirements-gallery.test.js` (refresh-then-gate locally,
  read-only in CI; plus a check that every leaf has exactly one marker). This
  requirement-first gallery **replaced** the old case-first `dev/requirements/ui/README.md`
  (since removed).
- **"Does the extension load?"** is guarded in two layers:
  `extension-test/integration/extension-loads.test.js` (always-on, no browser — boots the
  service worker through a Chrome-faithful `importScripts` and checks every
  injected/manifest file, #146) and
  `dev/requirements/heavy/extension-load.chrome.test.js` (`npm run test:e2e` —
  the real unpacked extension under Chrome for Testing; skips without
  `CHROME_PATH`, so verify changes to it via CI).
- **SPA rendering is delegated to ScraperAPI, not done here.** Page fetching
  (`dev/requirements/extractor/page-infra/fetch-page.js`) routes through ScraperAPI
  when `SCRAPER_API_KEY` is set, and `render=true` makes it execute the page's JS,
  so a single-page-app records with real data. The repo carries no SPA-shell
  detector or headless-Chrome render of its own any more (`spa-shell.js` /
  `render-page.js` and the `render-page.chrome.test.js` heavy test were removed when
  fetching moved to ScraperAPI). The recorder
  (`dev/requirements/extractor/page-infra/refresh-cache.js`) is now just fetch → write.
