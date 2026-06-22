# Technical gotchas

Non-obvious footguns specific to this codebase — traps that have cost real
debugging time, recorded so they bite only once. Overarching architecture rules
live in [architectureGuidelines.md](architectureGuidelines.md); project-agnostic
engineering practices in [engineeringPractices.md](claude/shared/engineeringPractices.md).

**Scope — project-wide footguns only.** A trap you'd only trip over *while
editing one specific file or function* (a mistake of **commission**, made with
that file open) belongs in that file's **top-of-file header comment**, not here:
it loads on-demand when Claude opens the file, can't drift from the code, and
stays off the always-loaded `CLAUDE.md` budget. Keep an entry here only when
Claude could hit it *without* reading the locus file — a mistake of **omission**
(you must know it to decide whether to open/avoid the file) or a cross-cutting
trap spanning files. See the full locality rule in
[claude/workflow.md](claude/workflow.md).

- **The SPA-shell render fallback executes untrusted page JS — never give it the
  e2e test's `--no-sandbox`, and gate it tightly.** The recorder renders a page
  in real headless Chrome (`dev/requirements/infra/data/render-page.js`) only when `dev/requirements/infra/data/spa-shell.js`'s
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
- **Service-worker paths must be extension-root absolute.** The background service
  worker runs from `ui/toolbar-icon.js` (relative to the extension root,
  `extension/`), so any path it hands a Chrome API
  (`importScripts`, `action.setIcon`) or `fetch` must be extension-root absolute —
  a leading slash or `chrome.runtime.getURL(...)`. A bare relative path
  (`icons/...`, `pipeline/...`) resolves against `ui/` and silently fails: the
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
  getImageData`. (Used by `ui/toolbar-icon.js` to color the icon without the
  `tabs` permission. Also: a bare `hostSuffix: "example.com"` matcher also matches
  `evilexample.com` — pair `hostEquals: "example.com"` with
  `hostSuffix: ".example.com"` to mean "apex or any subdomain".) The real
  URL→icon match runs inside Chrome, so it's verified only by the CI-only
  real-Chrome test (`dev/requirements/fullBrowserHeavyTests/extension-load.chrome.test.js`).
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
  hang-proofing rule in [engineeringPractices.md](claude/shared/engineeringPractices.md).)
- **`git mv` on a directory containing a submodule updates `.gitmodules` and the index but leaves `.git/config` stale — run `git submodule sync && git submodule update --init` after.** When `docs/claude/shared/` (the Claudinite submodule) moved to `dev/procedures/claude/shared/` via `git mv docs dev/procedures`, git correctly rewrote `.gitmodules` and the index; but the local `.git/config` still had `[submodule "docs/claude/shared"]` pointing at the old path. Until `git submodule sync` propagated the new path into `.git/config` and `git submodule update --init` re-registered it, any operation that consulted `.git/config` (submodule status, checkout) saw the stale entry. Always run both commands after renaming a directory that houses a submodule.
- **A push or PR made with the Actions `GITHUB_TOKEN` does not start another
  workflow** — this GitHub-CI rule and its `workflow_dispatch` exception live
  with the rest of the portable GitHub procedures in
  [claude/shared/git-and-github.md](claude/shared/git-and-github.md).
- **`Cannot find module 'jsdom'` means the dev deps aren't installed, not a code
  bug.** `node_modules` starts empty on a fresh checkout (including the ephemeral
  cloud sandbox); `jsdom` is a test-only devDependency loaded by `extension-test/harness.js`.
  Run `npm install` and re-run — don't look for another cause first.
- **Automated environments are bot-blocked from fetching target sites.** A
  live-page fetch that works on your machine often fails from CI/sandboxes:
  `npm run refresh` gets HTTP 403 in the cloud sandbox (so new cached HTML is
  filled by the **Refresh cached HTML files** workflow, not locally), and GitHub
  Actions runners get HTTP 400 from `facebook.com` (so Facebook is covered by unit
  tests only — it can't be a cached live case).
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
  fragment with `runScripts: "dangerously"` (see `extension-test/harness.js`) — a green test
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
  mid-session install). `.claude/cloud-setup.sh` must `cd` into the checkout first.
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
  the full-page `dev/requirements/data/*.html` test fixtures dwarf the source by bytes.
  `.gitattributes` marks `dev/requirements/data/*.html linguist-vendored` so Linguist ignores them;
  do the same for any future large generated/fixture files. (#78)
- **GitHub renders Markdown inside a raw `<td>` only when the cell content is
  blank-line-separated — and a CSS/`<div>` layout is sanitized away.** To get a
  two-column "image left, text right" layout that survives GitHub's renderer
  (`dev/requirements/requirements.md`'s gallery), wrap each row in a literal
  `<table>`/`<tr>`/`<td>` and put a **blank line before and after** the cell's
  content; cmark-gfm then re-enters Markdown mode inside the cell, so `![img]()`,
  `**bold**`, and links render. Without the surrounding blank lines the content is
  swallowed into the HTML block and shown verbatim. A leading inline `<!-- … -->`
  also starts an HTML block — keep any marker as the **last** token on the line so
  the line still *starts* as Markdown (how the generator tags its managed
  left-cell line). GitHub's sanitizer strips `style`/CSS (so a flexbox `<div>`
  two-column won't work) but keeps `<table>` + `align`/`valign`/`width`; and a GFM
  pipe-table cell can't hold the multi-line prose. (`dev/requirements/infra/build-requirements-gallery.js`.)
