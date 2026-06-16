# Testing

`npm test` runs everything; `docs/testing.md` has the mechanics. General test
discipline — see a test fail before trusting it, green-twice-before-merge,
self-diagnosing remote tests — lives in `docs/engineeringPractices.md`; this file
is the project-specific mechanics. Keep these decisions in mind:

- **Integration cases are the reviewed contract.** A person reads
  `test/integration/cases/` to confirm the behavior is right; nobody reviews the
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
  durations, site-specific descriptions) it can't know generically.
- **The fallback's coverage is gated, not just inspectable.**
  `test/integration/fallback-coverage.test.js` (in `test:live`, logic in
  `test/fallback-coverage.js`) runs every case page through both the dedicated
  source and the sources-emptied fallback, grades the fallback's primary event
  field-by-field, and fails if the critical-field or all-field match percentage
  drops below the high-watermark in `fallback-coverage.baseline.GENERATED.json`. That
  baseline stores the two percentages **plus the `cases` they were computed
  over**, and the gate compares the run to the watermark only over the cases they
  **share** — so a newly added case (absent from `cases`) is excluded and **adding
  an extractor never fails the gate** (#240), while every pre-existing case is
  still held to the bar. The watermark ratchets **up** on an unchanged case set
  and re-anchors to the current aggregate when the set changes (a `data/` refresh
  that legitimately moves a source's ground truth re-anchors the same way; a
  removed/renamed case needs a local re-baseline). It rewrites
  `docs/fallback-coverage.GENERATED.md` (per-host/field/case breakdown) locally — commit it
  like a UI snapshot; it's a read-only gate in CI. (Caveat: a single aggregate
  watermark means a regression bundled into the *same* change as a case-set change
  can be re-anchored over — don't commit a re-anchored baseline while the gate is
  red.)
- **jsdom's `body.innerText` is null**, so `GCal.bodyText()` (`innerText ||
  textContent`) returns `textContent` in tests — including `<select>`/`<option>`
  and hidden text a real browser's `innerText` omits. A generic visible-text
  extraction can therefore pass against cached HTML yet find nothing in Chrome;
  treat body-text results as jsdom-optimistic and don't add a case that only
  passes because of this (same class of jsdom-vs-Chrome gap as the `<noscript>`
  note in `sources/telavivcinematheque.js`).
- **New cached HTML files** can't be fetched here (this environment is
  bot-blocked, so `npm run refresh` gets HTTP 403). Record the cached HTML
  *before* writing the case, so you can read its exact `expected` off a
  committed file instead of guessing:
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
  3. Pull, then add `test/integration/cases/<name>.json` (same `<name>`, just
     `description` + `expected`, no `url`) and run `npm run test:live` — it now
     runs against the local cached HTML, so its output gives you the exact
     `expected` to paste in. Commit and push.
- **UI changes** (popup or toolbar icon) need their snapshot captured for future
  comparison: regenerate the stored PNGs with `npm run refresh:ui` and commit
  them so the diff shows the before/after. (The render is deterministic — satori
  + resvg, no browser or network — so whoever makes the UI change generates them
  on their own branch; there's no CI workflow for it.) The popup's states are
  authored as static markup in `ui/views/popup-states.html`, styled by the real
  `ui/popup.css` (the renderer inlines it — no duplicated style values); edit
  that file (and the views it mirrors) for a UI change, then regenerate. A new
  popup state needs a new `.state` section there and its own snapshot.
- **The snapshot renderer works within satori's limits** (`test/ui/popup-renderer.js`),
  which aren't obvious — verify a markup/CSS change by running `npm run refresh:ui`,
  don't reason about it. satori has no CSS engine (it ignores `<style>`/`<link>`),
  so the renderer inlines `ui/popup.css` onto the markup itself (parse rules →
  match with jsdom → fold into inline styles); don't cherry-pick properties —
  satori silently ignores what it can't use. What it *does* require: an explicit
  `display: flex` (or `none`/`contents`) on any box with element children — a lone
  *text* child is exempt, and a children **array** counts as multi-child, so pass a
  lone child unwrapped and give an empty element no children at all; `display:
  flex; justify-content: center` (not `text-align`) to center a box's content; and
  a bundled font (the CSS font stack won't match a loaded font). Drop only a
  `display` value satori rejects (e.g. `inline-block`).
- **"Does the extension load?" is guarded in two layers.** A startup failure —
  a bad service-worker `importScripts` path (#146), a missing/renamed injected
  file, a syntax error in one — must fail a test, not just surface when someone
  loads the unpacked extension:
  - `test/integration/extension-loads.test.js` (always-on, no browser) boots the
    manifest's service worker through a Chrome-faithful `importScripts`
    (relative to the worker's dir, leading slash = extension root) and asserts it
    wires up, every injected file parses, and every manifest-referenced file
    exists. It runs in the default suite and in `test:offline`.
  - `test/e2e/extension-load.chrome.test.js` (`npm run test:e2e`) loads the real
    unpacked extension and asserts the MV3 service worker registers and `GCal` is
    built inside it. It has **no npm dependency** — it drives Chrome straight over
    the DevTools Protocol with Node's built-in `WebSocket`. It needs a Chrome that
    still honours `--load-extension` (branded Chrome 137+ dropped it), so CI
    fetches **Chrome for Testing** via `npx @puppeteer/browsers` (run on demand,
    not a project dependency) and runs the test **headful under `xvfb`** (MV3
    extensions don't load headless). It **skips** when no Chrome is given (set
    `CHROME_PATH`) — a no-op in this bot-blocked sandbox, which can't even
    download Chrome for Testing. So verify changes to it via CI, not locally.
