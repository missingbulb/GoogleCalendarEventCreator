# Technical gotchas

Non-obvious footguns specific to this codebase — traps that have cost real
debugging time, recorded so they bite only once. Overarching architecture rules
live in [architectureGuidelines.md](architectureGuidelines.md); project-agnostic
engineering practices in [engineeringPractices.md](engineeringPractices.md).

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
  workflow.** GitHub suppresses workflow runs triggered by the built-in
  `GITHUB_TOKEN` to prevent recursion, so a workflow's own `git push` or
  `gh pr create` won't fire `test.yml` or `refresh-cache.yml`. The one exception is
  `workflow_dispatch` / `repository_dispatch` — which is why the auto-extractor
  pipeline dispatches `refresh-cache.yml` and `test.yml` explicitly (see
  `docs/claude/auto-extractor.md`). A run dispatched against a branch executes on
  its head commit, so its checks still attach to the PR.
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
