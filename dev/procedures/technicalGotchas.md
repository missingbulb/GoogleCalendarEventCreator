# Technical gotchas

Non-obvious footguns specific to this codebase — traps that have cost real
debugging time, recorded so they bite only once. Overarching architecture rules
live in [highLevelDesign.md](highLevelDesign.md).

**Scope — project-wide footguns only.** A trap you'd only trip over *while
editing one specific file or function* (a mistake of **commission**, made with
that file open) belongs in that file's **top-of-file header comment**, not here:
it loads on-demand when Claude opens the file, can't drift from the code, and
stays off the always-loaded `CLAUDE.md` budget. Keep an entry here only when
Claude could hit it *without* reading the locus file — a mistake of **omission**
(you must know it to decide whether to open/avoid the file) or a cross-cutting
trap spanning files. See the full locality rule in
[workflow.md](workflow.md).

- **JS single-page-app pages are rendered by ScraperAPI (`render=true`), not by
  us.** Page fetching is delegated wholesale to ScraperAPI (see the fetch-page
  workflow `.github/workflows/fetch-page.yml` / the bot-block gotcha
  below), and `render=true` makes it execute the page's JS and return the
  post-render HTML — so a JS app records with real data instead of an empty shell.
  The repo no longer carries any SPA-shell detection or headless-Chrome render of
  its own (the former `spa-shell.js` / `render-page.js` and their
  `RENDER_NO_SANDBOX` CI plumbing were removed). One consequence survives: rendered
  output isn't deterministic, so a re-record can legitimately shift a live case's
  `expected` — treat such drift like a site-markup change, and prefer extracting
  JSON-LD/`og:` (which apps often still inject) over brittle DOM positions.
- **Service-worker paths must be extension-root absolute** — a project instance of
  the portable MV3 rule (a worker's relative paths resolve against its *own* file
  location, not the extension root) maintained outside this repo. The background
  service worker runs from `icon/toolbar-icon.js` (relative to the extension root,
  `extension/`), so any path it hands a Chrome API (`importScripts`,
  `action.setIcon`) or `fetch` must use a leading slash or
  `chrome.runtime.getURL(...)`; a bare relative path (`images/...`,
  `event-extractors/...`) resolves against `icon/` and silently fails — the import
  aborts the worker (#146), or `setIcon` rejects with "Failed to fetch" (#204).
  Don't be fooled by stale web guides (Chromium #1262029) that say
  `setIcon({path})` is a silent no-op in a worker needing an
  `OffscreenCanvas`/`ImageData` workaround — here it *throws* "Failed to fetch",
  and the fix is the extension-root URL, not decoding the PNG to ImageData.
  (The toolbar worker no longer calls `setIcon` at all — it registers
  `chrome.declarativeContent` rules instead, see the next gotcha — but the
  extension-root-path rule still governs its `fetch(getURL(...))` calls.)
- **`chrome.declarativeContent.SetIcon` needs `imageData` (decoded via
  `OffscreenCanvas`), not `path`** — the portable MV3 rule (the documented `path`
  is unreliable; a DOM-less worker decodes the packaged PNG itself,
  `fetch(getURL(icon)) → blob → createImageBitmap → OffscreenCanvas.drawImage →
  getImageData`) is maintained outside this repo. Used by `icon/toolbar-icon.js` to
  color the icon without the `tabs` permission. **Project gotcha the canon doesn't
  cover:** a bare `hostSuffix: "example.com"` matcher also matches
  `evilexample.com` — pair `hostEquals: "example.com"` with
  `hostSuffix: ".example.com"` to mean "apex or any subdomain". The real URL→icon
  match runs inside Chrome, so it's verified only by the CI-only real-Chrome test
  (`dev/requirements/heavy/extension-load.chrome.test.js`).
- **Introspecting the MV3 service worker over CDP (the real-Chrome test) hits the
  portable CDP-introspection traps** (chrome.* callbacks don't settle under
  `awaitPromise: true`; a bare top-level `function`/`const` isn't reachable from an
  injected evaluate; a dormant worker has no globals until attaching restarts its
  top level, so **poll**) — maintained outside this repo. Here they bit
  `declarativeContent…getRules` (hung with no internal timeout until the job timed
  out), which is why the awaited signal is built from plain promises
  (`fetch`/`OffscreenCanvas`) and the worker publishes an explicit
  `globalThis.iconRulesReady` promise the test polls for. Bound every probe and add
  a test-level timeout regardless.
- **A push or PR made with the Actions `GITHUB_TOKEN` does not start another
  workflow** — this GitHub-CI rule and its `workflow_dispatch` exception are
  portable GitHub procedures maintained outside this repo.
- **Bot-blocking from CI is by datacenter IP (the general rule is a portable
  engineering practice maintained outside this repo); here the
  escape hatch is the `SCRAPER_API_KEY` Actions secret.** The pipeline's only page
  fetch lives in the fetch-page workflow (`.github/workflows/fetch-page.yml`), which
  routes a bare curl through ScraperAPI's residential proxy (with `render=true`, so a
  single-page-app records real data) using `secrets.SCRAPER_API_KEY`. The key lives
  in **GitHub Actions**, not the routine's own environment — so a page is recorded by
  dispatching that workflow (the create-extractor routine does this in step 4), not by
  a local fetch. ScraperAPI is the whole fetching surface — swap the vendor in that
  one workflow if it underperforms. Facebook returns a hard 400 even through the
  proxy, so it stays unit-tests-only — it can't be a cached live case.
- **jsdom-vs-Chrome DOM traps bit this repo directly.** `GCal.bodyText()`'s
  `innerText || textContent` fallback hits the jsdom `body.innerText`-is-null
  gotcha, and the default `runScripts: "outside-only"` parsing of `<noscript>`
  is the other one — both are portable Node/jsdom gotchas maintained outside
  this repo. They bit the body-text scan, `extension-test/harness.js`, and
  `custom/telavivcinematheque.js` (#130 / #137).
- **Injected block markup inside a `<p>` silently empties it — read the sibling,
  not the tag.** The portable HTML rule (raw-HTML injection of a block element makes
  the parser auto-close the `<p>`, so the content lands as its `nextElementSibling`
  and a `.foo p` selector reads `""` with no error) is maintained outside this repo.
  It hit building `custom/tel-aviv.js`'s
  `.benefitRemarks`/`.BenefitInstructions` description blocks (#602) — read
  `element.nextElementSibling` instead.
- **The shared `GCal` global must be augmented, not replaced, and per-load state
  reset** — a project instance of the portable injected-shared-global rule (merge
  via `Object.assign`, never `globalThis.X = {…}`; reset any state a file
  accumulates on each injection at load time) maintained outside this repo. Here: a
  wholesale `globalThis.GCal = {…}` wiped what other files had attached — an
  order-dependent `TypeError` (#48); and each source's `GCal.sources.push(...)`
  stacked duplicate matchers on every reopen (8 → 16 → 24…), so `registry.js` resets
  `GCal.sources` to a fresh array on load and is pinned first in the load order
  (#189).
- **The mounted `.claudinite` canon can be stale mid-session — re-run the sync
  hook before concluding an upstream fix hasn't synced.** The gitignored canon is
  refreshed by the `sync-claudinite.sh` SessionStart hook, so a session that
  started before an upstream commit (or whose hook fell back to the prior copy
  while offline) carries the older canon. When a task hinges on whether the mount
  carries fix X (e.g. pruning a local override the canon now subsumes), run
  `.claude/hooks/sync-claudinite.sh` by hand and re-check before reporting it
  absent — a stale mount, not an un-merged upstream, is the likelier cause when
  the fix is known to have landed. The same staleness works the *other* way: a
  stale mount also surfaces **spurious conformance findings** an already-merged
  canon fix would skip — so re-run the sync hook and re-check **before committing a
  workaround for a check finding** (a `.claudinite-checks.json` subtree accept, a
  suppression pragma). Twice a fixtures accept was added for a
  warning-suppression finding, then reverted once the mount picked up the
  vendored-skip fix that already made those files pass (#664, #665).
- **The cloud Setup script runs as root starting in the repo's parent dir
  (`/home/user`), not the checkout** — a project instance of the portable
  "setup script may start above the checkout" rule maintained outside this repo.
  A bare `npm ci` there finds no `package.json` and silently installs nothing (the tests
  then trigger a confusing mid-session install); the generic
  `.claudinite/environment-setup.sh` `cd`s into the checkout first. (#186 / #196)
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
  lines.** Both — including this repo's `<!-- … -->`-marker-last-token nuance for
  the `<td>` rule — are portable, project-agnostic rules maintained outside this
  repo. Here they apply to the
  `dev/requirements/extractor/data/**/*.html` fixtures (`.gitattributes`, #78) and the
  two-column gallery in `dev/requirements/requirements.md`
  (`dev/requirements/shared/build-requirements-gallery.js`).
