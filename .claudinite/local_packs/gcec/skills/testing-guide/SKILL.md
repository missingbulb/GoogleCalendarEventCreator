---
name: testing-guide
description: Map of this repo's test suites, the requirements model, and where each harness documents itself. Use before writing or changing tests here, adding a requirement case, or debugging a suite — the invariants live in the gcec pack's RULES.md; this is the deeper how-to.
---

# Testing in this repo

```sh
npm install
npm run test:live      # integration: the REVIEWED assertions for each supported site
npm run test:offline   # unit: internal tests of the extraction logic
npm run test:ui        # UI: rendered popup/icon vs. the stored snapshot image
npm run refresh:ui     # regenerate snapshots after an intentional UI change
npm run test:e2e       # heavy: real Chrome, CI-only (skips without CHROME_PATH)
npm test               # everything above except e2e
```

The invariants (mirror tree, reviewed-contract cases, `REFERENCE_NOW` floor,
refusal-test discipline) are always-loaded in the gcec pack's RULES.md. General
test discipline (see-it-fail, green-twice, high-watermark gating) is canon.
Adding a cached live case is the gcec pack's **add-live-case**
skill; the fallback-coverage gate's invariants are in that pack's RULES.md.

## The requirements model — every leaf has exactly one case

The spec (`dev/requirements/requirements.md`) is numbered prose; it does NOT
tag how a leaf is verified. Each leaf has exactly one
`<kind>/cases/<slug>.<id>.case.js` — the **filename** names the leaf, the
**folder** names the kind (the single classifier; no `kind` field, no side
manifest — issues #429/#435). `dev/requirements/shared/kinds.js` auto-discovers
kinds; adding one is a self-contained folder drop (`<kind>/kind.js`). The
kinds: **popup** (image, the popup's real `render()`), **icon** (image, the
real `toolbar-icon.js` in a fake browser), **behavior** (a click/navigation —
no image; verified by `dev/requirements/behavior/events-view-actions.test.js`),
**extractor** (per supported host, real extractor against a real cached page),
**logic** (product rules, executable `verify()`), plus `tbd: true` for a leaf
not yet faithfully verified. `dev/requirements/requirements-coverage.test.js`
fails unless every leaf has exactly one case (and rejects a typo'd/duplicate
case, an unknown kind, or a non-image case smuggling in a PNG). Full model +
how-to-add-one: `dev/requirements/README.md`.

⚠️ The behavior test **stubs** `chrome.tabs.create`/`window.close` — every leaf
is *claimed*, not every leaf *faithfully* verified (#435; the banner in
`requirements.md` says the same).

## Live integration tests

`dev/requirements/extractor/live.test.js` is driven by declarative JSON in
`expected/`: `expected.events` is the **complete, exact** array the extractor
produces — deep-equal on `title`/`start`/`end`/`location`/`ctz`/`details`, no
matchers, array length included. The page URL lives **only** in
`data/server-fetched/<name>.url` (single source of truth — the fetch workflow
and the test both read it; never in the case file). Tests run offline against
the committed cached HTML, loaded into a DOM at the `.url`'s URL so hostname
detection behaves exactly as in Chrome. `test.yml` never fetches — recording
goes through the fetch-page workflow (see add-live-case).

## UI snapshots

`dev/requirements/shared/render/visual-snapshots.test.js` renders each case and
pixel-compares (pixelmatch, `MAX_DIFF_RATIO = 0`) against the committed PNG.
`render-snapshot.js` picks the renderer by the case's folder: `popup/` → the
shipped `render()` path; `icon/` → the real `toolbar-icon.js` under
`fake-chrome.js`. Rasterizing is satori + resvg — **not a screenshot**: a
constrained flexbox subset that buys determinism with no browser; the renderer
folds the real `popup.css` onto the DOM as inline styles (one styling source of
truth). Snapshots are authored in **en-US** (a guard test enforces it). After
an intentional popup/view/CSS/icon change: `npm run refresh:ui`, commit the
PNGs + inline gallery. On mismatch the test writes `.actual.png`/`.diff.png`
under `dev/requirements/shared/.artifacts/` (gitignored) — and a moved baseline
goes through the snapshot-approval skill, never silent regeneration.

## Where each harness documents itself

The *why* of every non-obvious harness decision lives in that file's own
header/inline comments (the file-local-footgun rule) — read the file when you
touch it; this is just the map:

- Fallback-coverage gate — `dev/requirements/extractor/fallback/fallback-coverage.js`
  (field-by-field comparison) + `fallback-coverage.test.js` (the high-watermark
  gate, #240).
- UI snapshot renderer limits (satori/resvg, CSS inlining, tall-list clamp,
  `skipRender`) — `dev/requirements/shared/render/popup-renderer.js`; the
  pixel-exact diff + en-US guard — `visual-snapshots.test.js`; gestures —
  `actions.js`.
- Behavior verification (stubbed boundary, self-asserting coverage) —
  `dev/requirements/behavior/events-view-actions.test.js`.
- Two-column gallery generator (managed `<!-- req-gallery:<id> -->` lines only;
  the file is part-authored, NOT on the `ours` driver) —
  `dev/requirements/shared/build-requirements-gallery.js`, gated by
  `dev/requirements/shared/requirements-gallery.test.js`.
- "Does the extension load?" — two layers:
  `extension-test/integration/extension-loads.test.js` (always-on, Chrome-faithful
  `importScripts`, #146) and `dev/requirements/heavy/extension-load.chrome.test.js`
  (real Chrome, verify via CI).
- Requirement numbering is parsed by `dev/requirements/shared/ui-requirements.js`
  (numbers only — it does NOT classify leaves).
