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
  us.** Page fetching is delegated wholesale to ScraperAPI (see `scraperapi_fetch` in
  `dev/create-extractor/phase1-prepare.sh` / the bot-block gotcha
  below), and `render=true` makes it execute the page's JS and return the
  post-render HTML — so a JS app records with real data instead of an empty shell.
  The repo no longer carries any SPA-shell detection or headless-Chrome render of
  its own (the former `spa-shell.js` / `render-page.js` and their
  `RENDER_NO_SANDBOX` CI plumbing were removed). One consequence survives: rendered
  output isn't deterministic, so a re-record can legitimately shift a live case's
  `expected` — treat such drift like a site-markup change, and prefer extracting
  JSON-LD/`og:` (which apps often still inject) over brittle DOM positions.
- **Service-worker relative paths resolving against the worker's own folder, not
  the extension root** — a portable Chrome-extension rule maintained outside this
  repo (`technologies/chrome-extension.md`). It bit `icon/toolbar-icon.js`: a bare
  relative path (`images/...`, `event-extractors/...`) aborted the worker on
  import (#146) or made `setIcon` reject with "Failed to fetch" (#204), before the
  worker moved to `chrome.declarativeContent` rules (see the next gotcha) — which
  still needs the extension-root-absolute form for its `fetch(getURL(...))` calls.
- **`chrome.declarativeContent.SetIcon` needing `imageData` (not `path`), built
  via `OffscreenCanvas`, is a portable Chrome-extension rule maintained outside
  this repo** (`technologies/chrome-extension.md`) — used here by
  `icon/toolbar-icon.js` to color the icon without the `tabs` permission. Also
  (not covered by that rule): a bare `hostSuffix: "example.com"` matcher also
  matches `evilexample.com` — pair `hostEquals: "example.com"` with
  `hostSuffix: ".example.com"` to mean "apex or any subdomain". The real
  URL→icon match runs inside Chrome, so it's verified only by the CI-only
  real-Chrome test (`dev/requirements/heavy/extension-load.chrome.test.js`).
- **Introspecting an MV3 service worker over CDP has traps that each cost a CI
  round-trip** — the `chrome.*`-callback-hang, unreachable-bare-identifier, and
  dormant-worker-needs-polling traps are a portable Chrome-extension rule
  maintained outside this repo (`technologies/chrome-extension.md`). Here
  `declarativeContent…getRules` was the API that hung; the worker exposes
  `globalThis.iconRulesReady` as the pollable signal. Bound every probe and add a
  test-level timeout regardless, per the hang-proofing testing rule.
- **A push or PR made with the Actions `GITHUB_TOKEN` does not start another
  workflow** — this GitHub-CI rule and its `workflow_dispatch` exception are
  portable GitHub procedures maintained outside this repo.
- **Bot-blocking from CI is by datacenter IP (the general rule is a portable
  engineering practice maintained outside this repo); here the
  escape hatch is the optional `SCRAPER_API_KEY` secret.** When set, the pipeline's
  only page fetch (`scraperapi_fetch` in
  `dev/create-extractor/phase1-prepare.sh`) routes through ScraperAPI's
  residential proxy (with `render=true`, so a single-page-app records real data).
  Unset (a fresh clone, the cloud sandbox), it fetches directly and stays
  bot-blocked — so a target page can only be recorded by the auto-extractor
  pipeline running in CI (where the secret is wired), not locally. ScraperAPI is the
  whole fetching surface — swap the vendor in that one function if it underperforms.
  Facebook returns a hard 400 even through the proxy, so it stays unit-tests-only —
  it can't be a cached live case.
- **jsdom-vs-Chrome DOM traps bit this repo directly.** `GCal.bodyText()`'s
  `innerText || textContent` fallback hits the jsdom `body.innerText`-is-null
  gotcha, and the default `runScripts: "outside-only"` parsing of `<noscript>`
  is the other one — both are portable Node/jsdom gotchas maintained outside
  this repo. They bit the body-text scan, `extension-test/harness.js`, and
  `custom/telavivcinematheque.js` (#130 / #137).
- **Injected block markup inside a `<p>` silently empties it — read the sibling,
  not the tag** (portable HTML-parsing rule maintained outside this repo,
  `technologies/html.md`). Hit building `custom/tel-aviv.js`'s
  `.benefitRemarks`/`.BenefitInstructions` description blocks (#602).
- **The shared `GCal` global must be augmented, never replaced, and reset
  per-load** — a portable Chrome-extension rule (`technologies/chrome-extension.md`)
  about any global assembled by multiple injected files and re-injected on
  activation. Here: (a) `globalThis.GCal = {…}` wholesale-replacing it caused an
  order-dependent `TypeError` (#48), fixed via `Object.assign`; (b)
  `GCal.sources.push(...)` stacked duplicate matchers on every reopen
  (8 → 16 → 24…), so `registry.js` resets `GCal.sources` to a fresh array on load
  and is pinned first in the load order (#189).
- **The cloud Setup script runs as root starting in the repo's parent dir
  (`/home/user`), not the checkout** — a project instance of the portable
  "setup script may start above the checkout" rule maintained outside this repo.
  A bare `npm ci` there finds no `package.json` and silently installs nothing (the tests
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
  lines.** Both — including this repo's `<!-- … -->`-marker-last-token nuance for
  the `<td>` rule — are portable, project-agnostic rules maintained outside this
  repo. Here they apply to the
  `dev/requirements/extractor/data/**/*.html` fixtures (`.gitattributes`, #78) and the
  two-column gallery in `dev/requirements/requirements.md`
  (`dev/requirements/shared/build-requirements-gallery.js`).
