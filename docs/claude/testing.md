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
  `executable-requirements/extractors/custom/` to confirm the behavior is right; nobody reviews the
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
- **All requirements live in `executable-requirements/`.** The spec docs and
  every validating test are in that one top-level folder; the document model and
  the how-to-add-one rules are in
  [executable-requirements/README.md](../../executable-requirements/README.md).
  The notes below are the project decisions behind that model.
- **Every leaf is verified by exactly one CASE, which declares HOW (issue #429,
  #435).** The spec (`executable-requirements/requirements.md`) is just numbered prose; it does NOT
  tag how a leaf is verified. Each leaf has exactly one `<slug>.<id>.case.js` (the
  *filename* is the link — `<slug>` is the section's component name, `<id>` the
  dotted leaf number), and the **case** declares its `kind` (default `"popup"`)
  plus an optional `tbd` flag. `executable-requirements/infra/render-snapshot.js` is the one dispatcher
  that turns a case into a PNG by its `kind` (only the image kinds have a
  renderer) — so there is ONE routing system across visual and non-visual leaves:
  - `kind: "popup"` (default) — an image leaf, the popup's real `render()` via
    `executable-requirements/infra/popup-renderer.js`, pinned by a `<slug>.<id>.png` snapshot shown in a
    **two-column table** beside the requirement (image left, spec right) in
    `executable-requirements/requirements.md` by `executable-requirements/infra/build-requirements-gallery.js`.
  - `kind: "icon"` — an image leaf too, but rendered by the real
    `extension/ui/toolbar-icon.js` loaded into a fake browser (`executable-requirements/infra/icon-renderer.js` +
    `executable-requirements/infra/fake-chrome.js`), fed the case's faked tab URL + host lists (the
    toolbar icon, §10).
  - `kind: "behavior"` — a click/navigation a static image can't observe (e.g.
    `9.1`–`9.3`, `3.4`); the case carries NO image and is verified by
    `executable-requirements/ui/events-view-actions.test.js` (which self-asserts it covers exactly
    the `kind: "behavior"` cases). A `<slug>.<id>.png` for one is the #429 anti-pattern
    and the gate rejects it.
  - `kind: "extractor"` — a non-image leaf (§11, "Required explicit support for
    Extractors"): one per supported host, validated by running the real per-site
    extractor against a real cached page (`executable-requirements/data/<page>.html`)
    and asserting the host is recognized as supported and yields a complete event.
    Verified by `executable-requirements/extractors/extractor-support.test.js`; the
    case names `{ host, source, page }`. A bot-blocked host with no cacheable page
    (facebook) is a `tbd` extractor case (unit-tested only).
  - `kind: "logic"` — a non-image, non-visual product/behavior leaf (§12–§16, the
    rules converted from `productRequirements.md`). A wired case carries an
    executable `verify()` run by `executable-requirements/product-requirements.test.js`;
    a `tbd` logic case is tracked-but-not-wired and names the unit test that covers
    it today (`coveredBy`).
  - `tbd: true` — a leaf not (yet) faithfully verified here: an image edge case
    whose behavior isn't decided yet (e.g. `4.2.3`, `4.10`) still renders a
    provisional snapshot under a "TO BE DECIDED" banner; a non-image `tbd` case
    (extractor/logic) is reported skipped with a pointer to its current coverage.
    The edge-case-review routine (#438) resolves the image ones over time.

  `executable-requirements/requirements-coverage.test.js` fails unless **every leaf has exactly
  one case** (and rejects a nonexistent/typo'd/duplicate case, an unknown `kind`, or
  a non-image case — behavior/extractor/logic — that smuggled in a PNG). A case earns its keep by pinning a
  requirement's correct rendering/behavior — confirmed by a human against the PNG,
  not "can these pixels be generated?". The popup's pure logic stays pinned by unit
  tests (`popup-content` / `events-view` / `popup-truncation`).

  **⚠️ This verification is deliberately INCOMPLETE — tracked in #435.** Every leaf
  is *claimed* by the right kind of test, but the behavior test **stubs**
  `chrome.tabs.create`/`window.close` — so it confirms our code *asks* for the
  right action, not that a real Chrome performs it. A faithful (non-stub)
  verification of the `kind: "behavior"` leaves is still owed (the owner will address
  it separately). A loud banner in `executable-requirements/requirements.md` says the same: a green
  build means every leaf is *claimed*, not that every leaf is *faithfully*
  verified.
- **An executable requirements test case declares HOW it's verified, with a default
  — never a parallel classifier.** When each numbered requirement is pinned by its
  own executable case (`<slug>.<id>.case.js`), the case carries its verification kind as
  its own field (`kind`, defaulting to the common one, plus a flag like `tbd`) rather
  than the spec prose tagging it or a side manifest keyed by id. One source of truth
  means a case can't desync from its classifier, and it collapses parallel routing
  systems into one dispatcher: this repo folded the `_(icon)_` / `_(behavior)_` /
  `_(TBD)_` spec tags **and** a behavior-coverage manifest into the per-case
  `kind`/`tbd` described in the bullet above.

## Adding a cached integration case

New cached HTML can't be fetched here (the sandbox is bot-blocked — see
`docs/technicalGotchas.md`), so record the cached HTML *before* writing the case
and read its exact `expected` off the committed file instead of guessing:

1. Commit two new files — but **not** the case file yet:
   - `executable-requirements/data/<name>.html` — an empty (zero-byte) file; the empty file is the
     "fetch me" signal for the refresh script.
   - `executable-requirements/data/<name>.url` — a plain-text file containing just the event page URL
     (e.g. `https://www.meetup.com/.../`). This file stays for good: it's the
     single source of truth for the page's URL (used by the refresh script and
     by `live.test.js`), so the URL is **not** repeated in the case file.
2. Push the branch. The **Refresh cached HTML files** workflow runs
   automatically (the push adds a `data/` file), fills in the empty
   `executable-requirements/data/<name>.html`, and commits it back to the branch; `test:live` stays
   green because no case asserts it yet.
3. Pull, then add `executable-requirements/extractors/custom/<name>.json` (same `<name>`, just
   `description` + `expected`, no `url`) and run `npm run test:live` — it now
   runs against the local cached HTML, so its output gives you the exact
   `expected` to paste in. Commit and push.

## Where each test harness documents itself

These harnesses are self-documenting: the *why* of every non-obvious decision
lives in the file's own header/inline comments, so it can't drift from the code.
Read the file when you touch it; the one-liners here are just a map. (This same
co-location applies to **any** file-local footgun, not just harness mechanics — a
commission-while-editing trap goes in the file's header comment rather than
`docs/technicalGotchas.md`; see the locality rule in
[workflow.md](workflow.md).)

- **Fallback-coverage gate** — `executable-requirements/extractors/fallback/fallback-coverage.js`
  (the field-by-field comparison) and `fallback-coverage.test.js` (the
  high-watermark gate over a changing case set, #240). Runs in `test:live`;
  rewrites `fallback-coverage.GENERATED.md` locally and is read-only in CI.
  Adding an extractor never fails it.
- **UI snapshots** — the renderer's satori/resvg limits, CSS inlining (no
  selector specificity), the tall-list clamp, and the `skipRender` initial-shell
  case are in `executable-requirements/infra/popup-renderer.js`; the pixel-exact diff
  (`MAX_DIFF_RATIO = 0`) and the en-US-locale guard are in
  `executable-requirements/ui/popup-snapshots.test.js`; the scroll/fade gestures are in
  `executable-requirements/infra/actions.js`. A case is a self-contained per-leaf `<slug>.<id>.case.js`
  (fake data + an optional DOM action) + `<slug>.<id>.png`; `executable-requirements/infra/render-snapshot.js`
  picks the renderer by the case's own `kind` (default `"popup"` → the popup's REAL
  `render()`; `"icon"` → the real `extension/ui/toolbar-icon.js` in a fake browser,
  `icon-renderer.js` + `fake-chrome.js`), so a view or icon change moves the
  snapshots automatically. After an intentional popup/view/CSS or toolbar-icon
  change run `npm run refresh:ui` and commit the PNGs + inline gallery
  (deterministic, no CI workflow). The requirement list is parsed from
  `executable-requirements/requirements.md` by `executable-requirements/infra/ui-requirements.js` (numbers only — it does
  NOT classify leaves), shared with the coverage ubertest
  (`executable-requirements/requirements-coverage.test.js`); how each leaf is verified
  (`popup` / `icon` / `behavior` / `tbd`) is the **case's** `kind`/`tbd`, not a spec
  tag.
- **Behavior verification** — `executable-requirements/ui/events-view-actions.test.js` drives the
  clicks the snapshots can't (the `kind: "behavior"` leaves: a card / instance
  button / affordance link opens an adjacent new tab and closes the popup); it reads
  the cases and self-asserts it covers exactly those leaves. It **stubs** the
  `chrome.tabs.create`/`window.close` boundary, so it's explicitly INCOMPLETE (a
  loud banner in the file; a faithful non-stub verification is owed in #435).
- **Two-column requirements gallery** — `executable-requirements/infra/build-requirements-gallery.js`
  lays each leaf out as an HTML `<table>` row in `executable-requirements/requirements.md`: the
  generated `<slug>.<id>.png` (or a behavior-test note) in the **left** cell, the
  hand-authored requirement in the **right** cell. GitHub renders the markdown in
  each `<td>` because the cell content is blank-line-separated. The generator
  rewrites **only** the managed left-cell line — tagged `<!-- req-gallery:<id> -->`
  — never the scaffolding or prose, so `executable-requirements/requirements.md` is
  part-generated/part-authored and is **not** on the `ours` merge driver (a prose
  conflict is resolved by hand; the left cells regenerate via `npm run regen`).
  Gated by `executable-requirements/ui/requirements-gallery.test.js` (refresh-then-gate locally,
  read-only in CI; plus a check that every leaf has exactly one marker). This
  requirement-first gallery **replaced** the old case-first `executable-requirements/ui/README.md`
  (since removed).
- **"Does the extension load?"** is guarded in two layers:
  `test/extension/extension-loads.test.js` (always-on, no browser — boots the
  service worker through a Chrome-faithful `importScripts` and checks every
  injected/manifest file, #146) and
  `executable-requirements/fullBrowserHeavyTests/extension-load.chrome.test.js` (`npm run test:e2e` —
  the real unpacked extension under Chrome for Testing; skips without
  `CHROME_PATH`, so verify changes to it via CI).
- **SPA-shell render fallback** (#310, #328) — the detector (`executable-requirements/infra/data/spa-shell.js`,
  `shouldRender = isSpaShell && !hasEventData`, keying on a machine start date)
  is pure and unit-tested
  offline in `test/unit/spa-shell.test.js`; the headless render itself
  (`executable-requirements/infra/data/render-page.js`, sharing the DevTools client `executable-requirements/infra/data/cdp-client.js` with
  the extension-load test) is exercised by
  `executable-requirements/fullBrowserHeavyTests/render-page.chrome.test.js` against a self-authored
  `data:` URL — CI-only, skips without `CHROME_PATH`. The recorder
  (`executable-requirements/infra/data/refresh-cache.js`) calls the render only when the plain fetch returns a
  data-less SPA shell, and keeps it only if it gained extractable data;
  `refresh-cache.yml` wires `CHROME_PATH` so this happens when recording.
