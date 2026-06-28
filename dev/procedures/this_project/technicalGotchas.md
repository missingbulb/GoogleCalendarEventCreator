# Technical gotchas

Non-obvious footguns specific to this codebase — traps that have cost real
debugging time, recorded so they bite only once. Overarching architecture rules
live in [this_project/highLevelDesign.md](highLevelDesign.md).

**Scope — project-wide footguns only.** A trap you'd only trip over *while
editing one specific file or function* (a mistake of **commission**, made with
that file open) belongs in that file's **top-of-file header comment**, not here:
it loads on-demand when Claude opens the file, can't drift from the code, and
stays off the always-loaded `CLAUDE.md` budget. Keep an entry here only when
Claude could hit it *without* reading the locus file — a mistake of **omission**
(you must know it to decide whether to open/avoid the file) or a cross-cutting
trap spanning files. See the full locality rule in
[this_project/workflow.md](workflow.md).

- **JS single-page-app pages are rendered by ScraperAPI (`render=true`), not by
  us.** Page fetching is delegated wholesale to ScraperAPI (see `record_page` in
  `dev/create-extractor/phase1-prepare.sh` / the bot-block gotcha
  below), and `render=true` makes it execute the page's JS and return the
  post-render HTML — so a JS app records with real data instead of an empty shell.
  The repo no longer carries any SPA-shell detection or headless-Chrome render of
  its own (the former `spa-shell.js` / `render-page.js` and their
  `RENDER_NO_SANDBOX` CI plumbing were removed). One consequence survives: rendered
  output isn't deterministic, so a re-record can legitimately shift a live case's
  `expected` — treat such drift like a site-markup change, and prefer extracting
  JSON-LD/`og:` (which apps often still inject) over brittle DOM positions.
- **Service-worker paths must be extension-root absolute.** The background service
  worker runs from `icon/toolbar-icon.js` (relative to the extension root,
  `extension/`), so any path it hands a Chrome API
  (`importScripts`, `action.setIcon`) or `fetch` must be extension-root absolute —
  a leading slash or `chrome.runtime.getURL(...)`. A bare relative path
  (`images/...`, `event-extractors/...`) resolves against `icon/` (the worker's
  own folder) and silently fails: the
  import aborts the worker (#146), or `setIcon` rejects with "Failed to fetch" and
  the icon never changes (#204). Don't be fooled by stale web guides (Chromium
  #1262029) that say `setIcon({path})` is a silent no-op in a worker needing an
  `OffscreenCanvas`/`ImageData` workaround — here it *throws* "Failed to fetch",
  and the fix is the extension-root URL, not decoding the PNG to ImageData.
  (The toolbar worker no longer calls `setIcon` at all — it registers
  `chrome.declarativeContent` rules instead, see the next gotcha — but the
  extension-root-path rule still governs its `fetch(getURL(...))` calls.)
- **`chrome.declarativeContent.SetIcon` reliably needs `imageData`, not `path` —
  and a DOM-less MV3 worker must decode the PNG via `OffscreenCanvas`.** The API
  *documents* a `path` option, but in practice it's unreliable (silently leaves
  the icon unset / "Could not load icon"); the robust route is `imageData`. The
  reason is structural: `declarativeContent` rules are evaluated by the browser
  process, so the icon must be reduced to raw pixels and baked into the rule at
  registration time. Building that `imageData` in the service worker can't use a
  DOM `<canvas>`/`<img>` (there's no DOM) — decode the packaged PNG with
  `fetch(getURL(icon)) → blob → createImageBitmap → OffscreenCanvas.drawImage →
  getImageData`. (Used by `icon/toolbar-icon.js` to color the icon without the
  `tabs` permission. Also: a bare `hostSuffix: "example.com"` matcher also matches
  `evilexample.com` — pair `hostEquals: "example.com"` with
  `hostSuffix: ".example.com"` to mean "apex or any subdomain".) The real
  URL→icon match runs inside Chrome, so it's verified only by the CI-only
  real-Chrome test (`dev/requirements/heavy/extension-load.chrome.test.js`).
- **Introspecting an MV3 service worker over CDP (the real-Chrome test) has three
  traps that each cost a CI round-trip.** When `Runtime.evaluate`-ing inside the
  worker to verify its startup: (a) **`chrome.*` callback APIs don't reliably
  settle when awaited under `awaitPromise: true`** — `declarativeContent…getRules`
  hung forever (no internal timeout) until the whole job timed out; build the
  awaited signal from plain promises (`fetch`/`OffscreenCanvas`), not chrome.*
  callbacks. (b) **A bare top-level `function`/`const` name isn't reachable** from
  an injected evaluate — expose what the test reads as an explicit
  `globalThis.x = …` (the worker publishes an `iconRulesReady` promise this way).
  (c) **A dormant worker has no globals** until it re-runs its top level; with no
  tab/event listeners a test can trigger, attaching to the target is what starts
  it, and the first read still races startup — so **poll** until the global
  appears. (Bound every probe and add a test-level timeout regardless, per the
  hang-proofing rule.)
- **A push or PR made with the Actions `GITHUB_TOKEN` does not start another
  workflow** — this GitHub-CI rule and its `workflow_dispatch` exception are
  portable GitHub procedures maintained outside this repo.
- **Bot-blocking from CI is by datacenter IP (the general rule is in
  [general/engineeringPractices.md](../general/engineeringPractices.md)); here the
  escape hatch is the optional `SCRAPER_API_KEY` secret.** When set, the pipeline's
  only page fetch (`record_page` in
  `dev/create-extractor/phase1-prepare.sh`) routes through ScraperAPI's
  residential proxy (with `render=true`, so a single-page-app records real data).
  Unset (a fresh clone, the cloud sandbox), it fetches directly and stays
  bot-blocked — so a target page can only be recorded by the auto-extractor
  pipeline running in CI (where the secret is wired), not locally. ScraperAPI is the
  whole fetching surface — swap the vendor in that one function if it underperforms.
  Facebook returns a hard 400 even through the proxy, so it stays unit-tests-only —
  it can't be a cached live case.
- **jsdom-vs-Chrome DOM traps** — `body.innerText` is null (so `GCal.bodyText()`'s
  `innerText || textContent` returns `textContent`, including `<select>`/hidden
  text), and the default `runScripts: "outside-only"` parses `<noscript>` into live
  DOM (the opposite of a real browser). Both let a green test hide a broken live
  extraction; they're portable test-harness gotchas, documented in
  [general/testingPractices.md](../general/testingPractices.md). In this repo they bit
  the body-text scan, `extension-test/harness.js`, and `custom/telavivcinematheque.js`
  (#130 / #137).
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
  (`/home/user`), not the checkout** — a project instance of the general
  "setup script may start above the checkout" rule in
  [general/engineeringPractices.md](../general/engineeringPractices.md). A bare
  `npm ci` there finds no `package.json` and silently installs nothing (the tests
  then trigger a confusing mid-session install); `.claude/cloud-setup.sh` must `cd`
  into the checkout first. (#186 / #196)
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
- **Two portable GitHub gotchas this repo relies on — large fixtures need
  `linguist-vendored`, and Markdown inside a raw `<td>` needs surrounding blank
  lines.** The `linguist-vendored` rule is a portable, project-agnostic rule
  maintained outside this repo; the `<td>` blank-lines rule (with this repo's
  `<!-- … -->`-marker-last-token nuance, not yet upstreamed) is in the local
  working set [general/git-and-github.md](../general/git-and-github.md). Here they apply to the
  `dev/requirements/extractor/data/**/*.html` fixtures (`.gitattributes`, #78) and the
  two-column gallery in `dev/requirements/requirements.md`
  (`dev/requirements/shared/build-requirements-gallery.js`).
