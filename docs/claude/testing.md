# Testing

`npm test` runs everything; `docs/testing.md` has the mechanics. Keep
these decisions in mind:

- **`Cannot find module 'jsdom'` means the dev deps aren't installed**, not a
  code problem. `jsdom` is a test-only devDependency loaded by
  `test/harness.js`, and `node_modules` starts empty on a fresh checkout (e.g.
  this ephemeral environment). When you hit that error, run `npm install` and
  re-run the tests — don't look for any other cause first.

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
  2. Run the **Refresh cached HTML files** workflow. `refresh-cache.js` fills in
     the empty `data/<name>.html`; `test:live` stays green because no case
     asserts it yet.
  3. Pull, then add `test/integration/cases/<name>.json` (same `<name>`, just
     `description` + `expected`, no `url`) and run `npm run test:live` — it now
     runs against the local cached HTML, so its output gives you the exact
     `expected` to paste in. Commit and push.
- **UI changes** (popup or toolbar icon) need their snapshot captured for future
  comparison: regenerate the stored PNGs with `npm run refresh:ui` (or the
  **Refresh UI snapshot** workflow) and commit them so the diff shows the
  before/after. A new UI surface needs a new snapshot of its own.
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
