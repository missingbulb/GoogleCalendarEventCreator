# Technical gotchas

Non-obvious footguns specific to this codebase — traps that have cost real
debugging time, recorded so they bite only once. Overarching architecture rules
live in [architectureGuidelines.md](architectureGuidelines.md); project-agnostic
engineering practices in [engineeringPractices.md](engineeringPractices.md).

- **The SPA-shell render fallback executes untrusted page JS — never give it the
  e2e test's `--no-sandbox`, and gate it tightly.** The recorder renders a page
  in real headless Chrome (`data/render-page.js`) only when `data/spa-shell.js`'s
  `shouldRender` is true — a positive conjunction (`isSpaShell &&
  !hasEventData`), not "the body is small", so it never fires on a generic
  error body or a page that already carries an event date, and bot-challenge pages
  are excluded for free (no framework-root marker). The trigger keys on a
  **machine-readable start date** (`<time datetime>` / JSON-LD `startDate`), *not*
  on og:title or visible-text length: an SPA shell can carry the event name in
  og:title and kilobytes of nav/footer chrome yet hide every date+venue behind JS,
  which silently skipped the render for the motivating #277 page (#328). The
  separate `hasExtractableData` predicate (og:title / JSON-LD / text) is the
  *keep* check — whether a finished render gained content — not the trigger. Two traps: (a) the URL is
  user-supplied, so this runs *attacker-influenceable* JS — unlike
  `extension-load.chrome.test.js` (our own extension), it keeps Chrome's sandbox
  ON by default; `RENDER_NO_SANDBOX=1` is only for runners that can't support it,
  consciously leaning on the ephemeral CI runner as the boundary. (b) SPA output
  isn't deterministic, so a re-record can legitimately shift a live case's
  `expected` — treat a render-fallback case's drift like a site markup change, and
  prefer extracting JSON-LD/`og:` (which SPAs often still inject) over brittle DOM
  positions. CI-only: the cloud sandbox can't even download Chrome (below), so the
  render no-ops locally and is verified only in CI (#310).
- **Day-boundary date math must use UTC component math, not local-midnight +
  `toISOString()`.** Compute an adjacent day with `Date.UTC(y, m-1, d+1)` then
  `getUTC*` (as `nextDay` in `build-calendar-url.js` does).
  `new Date("YYYY-MM-DDT00:00:00")` is *local*
  midnight, which under a positive UTC offset is the previous UTC day, so
  `toISOString()` reports the wrong adjacent date. The UTC/`C.UTF-8`
  sandbox/CI default parses floating times as UTC, so a unit test there won't
  surface the shift — it only shows in a positive-offset locale.
- **Service-worker paths must be extension-root absolute.** The background service
  worker runs from `ui/toolbar-icon.js`, so any path it hands a Chrome API
  (`importScripts`, `action.setIcon`) or `fetch` must be extension-root absolute —
  a leading slash or `chrome.runtime.getURL(...)`. A bare relative path
  (`icons/...`, `pipeline/...`) resolves against `ui/` and silently fails: the
  import aborts the worker (#146), or `setIcon` rejects with "Failed to fetch" and
  the icon never changes (#204). Don't be fooled by stale web guides (Chromium
  #1262029) that say `setIcon({path})` is a silent no-op in a worker needing an
  `OffscreenCanvas`/`ImageData` workaround — here it *throws* "Failed to fetch",
  and the fix is the extension-root URL, not decoding the PNG to ImageData.
- **A push or PR made with the Actions `GITHUB_TOKEN` does not start another
  workflow** — this GitHub-CI rule and its `workflow_dispatch` exception live
  with the rest of the GitHub procedures in
  [claude/github.md](claude/github.md).
- **`gh issue edit --add-label` fails when the label doesn't exist yet** — unlike
  applying an already-defined label, GitHub won't create it on demand, so a
  workflow that adds a brand-new label breaks the first time it runs. Create it
  idempotently first (`gh label create "<name>" --color … 2>/dev/null || true`),
  then `--add-label`. (The download-failure hand-off in
  `auto-implement-extractor.yml` adds `human involvement required` this way.)
- **`Cannot find module 'jsdom'` means the dev deps aren't installed, not a code
  bug.** `node_modules` starts empty on a fresh checkout (including the ephemeral
  cloud sandbox); `jsdom` is a test-only devDependency loaded by `test/harness.js`.
  Run `npm install` and re-run — don't look for another cause first.
- **Automated environments are bot-blocked from fetching target sites.** A
  live-page fetch that works on your machine often fails from CI/sandboxes:
  `npm run refresh` gets HTTP 403 in the cloud sandbox (so new cached HTML is
  filled by the **Refresh cached HTML files** workflow, not locally), and GitHub
  Actions runners get HTTP 400 from `facebook.com` (so Facebook is covered by unit
  tests only — it can't be a cached live case).
- **Google Calendar renders the event `details` field as HTML, not Markdown.**
  Text placed in the `details` URL parameter is HTML: a bare `**bold**` shows
  literal asterisks and a bare URL is auto-linked (so it needs no `<a>`).
  `pipeline/build-calendar-url.js` translates the Markdown that survives
  extraction (Meetup / JSON-LD descriptions) into HTML for exactly this reason.
  (#91, #102)
- **jsdom's `body.innerText` is null**, so `GCal.bodyText()` (`innerText ||
  textContent`) returns `textContent` in tests — including `<select>`/`<option>`
  and hidden text a real browser's `innerText` omits. A generic visible-text
  extraction can therefore pass against cached HTML yet find nothing in Chrome;
  treat body-text results as jsdom-optimistic, and don't add an integration case
  that only passes because of this (same jsdom-vs-Chrome class as the `<noscript>`
  gotcha below, and the note in `sources/telavivcinematheque.js`).
- **jsdom's default `runScripts: "outside-only"` parses `<noscript>` into live DOM
  — the opposite of a real browser.** With scripting off, jsdom turns `<noscript>`
  content into real elements, so a `textContent` read looks clean in a test but
  splices `<img>`/markup into the value in Chrome (which, scripting on, keeps
  `<noscript>` as raw text). To reproduce the browser, parse a script-free
  fragment with `runScripts: "dangerously"` (see `test/harness.js`) — a green test
  here can otherwise hide a broken live extraction. (#130 / #137)
- **The shared `GCal` global is assembled by many files and re-injected on every
  popup open — augment it, and reset per-load state.** Two traps from one fact
  (`GCal` is a mutable global, loaded repeatedly into a page world that persists
  between opens): (a) a file that does `globalThis.GCal = {…}` wholesale-replaces
  it and wipes what other files already attached — an order-dependent `TypeError`
  (#48); always augment via `Object.assign`. (b) Each source's
  `GCal.sources.push(...)` stacks duplicate matchers on every reopen
  (8 → 16 → 24…), so `registry.js` resets `GCal.sources` to a fresh array on load
  and is pinned first in the load order (#189). Anything that runs at injection
  time must be safe to run again.
- **The cloud Setup script runs as root starting in the repo's parent dir
  (`/home/user`), not the checkout.** A bare `npm ci` there finds no
  `package.json` and silently installs nothing (the tests then trigger a confusing
  mid-session install). `scripts/cloud-setup.sh` must `cd` into the checkout first.
  (#186 / #196)
- **`clean()` collapses all whitespace including newlines — use it only for
  single-line fields.** Title and location are whitespace-collapsed, but a
  description run through `clean()` loses every line break (it bit Meetup,
  Ticketmaster, and the JSON-LD layer — #131, #140, #141). Multi-line text must go
  through the block helpers (`blockText` / `normalizeBlock` / `htmlToText`), which
  preserve `<br>` and literal newlines; line-break handling is generic, not a
  per-source choice.
- **A supported/registered host is necessary but not sufficient for "an event."**
  Gating "is this an event?" on `Boolean(site)` made every page on a supported
  host count as one, surfacing a phantom event (og:title + a footer location +
  "No date found") on e.g. the site's home page (#133). A real event must require
  actual data — JSON-LD or a parsed date — not merely a host match.
- **Large cached HTML fixtures skew GitHub's language stats — mark them
  `linguist-vendored`.** GitHub reported this JS extension as "mostly HTML" because
  the full-page `data/*.html` test fixtures dwarf the source by bytes.
  `.gitattributes` marks `data/*.html linguist-vendored` so Linguist ignores them;
  do the same for any future large generated/fixture files. (#78)
