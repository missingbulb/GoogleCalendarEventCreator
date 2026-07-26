---
name: add-live-case
description: Record a cached event page and author its reviewed live case for the extractor suite. Use when adding or refreshing a case under dev/requirements/extractor/ — new site support, a new behavior on a supported site, or re-recording a taken-down event page.
---

# Adding a cached integration case

Live cases are the **reviewed contract**: a person reads
`dev/requirements/extractor/expected/` to confirm each site is handled
correctly, so every added/changed site behavior needs one (one real, focused
event page per distinct behavior — keep cases minimal, no incidental
complexity). The tests run **offline** against committed cached HTML in
`dev/requirements/extractor/data/server-fetched/`, loaded into a DOM at the
`.url` file's URL so hostname detection behaves exactly as in Chrome.

New cached HTML can't be fetched from this sandbox (bot-blocked — see the
gcec pack's RULES.md, "Extractor pipeline" section), so record the page *before* writing the
case and read its exact `expected` off the committed file instead of guessing:

1. Land one new file on `main` — but **not** the case file yet:
   `dev/requirements/extractor/data/server-fetched/<name>.url` — plain text,
   just the event page URL. This file stays for good: it is the **single source
   of truth** for the page's URL (it is what the recorder fetches and what
   `live.test.js` sets the DOM origin from), so the URL is **not** repeated in
   the case file.
2. Wait for the **`record-page` task** to record it. There is nothing to
   dispatch: that task runs on the hourly scheduler, and a committed `.url` with
   no sibling `.html` *is* the request. It fetches the page through ScraperAPI
   (whose secret only a task's preprocessing worker can reach — see the gcec
   pack's RULES.md, "Extractor pipeline") and opens a **Record cached event
   pages** PR carrying `<name>.html`. Merge it. `test:live` stays green
   throughout, because no case asserts the page yet.
3. Add `dev/requirements/extractor/expected/<name>.json` (same `<name>`, just
   `description` + `expected`, no `url`) and run `npm run test:live` — it now
   runs against the local cached HTML, so its output gives you the exact
   `expected` to paste in. Commit and push.

For a **new site** (or a new behavior on a supported one), you usually don't need
this at all: file an `extractor-request` issue with the event URL and the
`create-extractor` task does the whole thing — records the page, scaffolds the
case, writes the extractor, and opens the PR.

`expected.events` is the **complete, exact** array the extractor produces —
deep-equal on `title`, `start`, `end`, `location`, `ctz`, and `details`, no
matchers, array length included (one event for an ordinary page, several for a
listing/series page). See `live.test.js`'s header for how each field derives.

**Gardening:** when an event page is eventually taken down, point `<name>.url` at
a newer event **and delete the stale `<name>.html`** in the same commit — that is
the whole re-record request; `record-page` fetches the new page on its next run.
Until a cached HTML file exists for a case, `test:live` (and the Tests workflow)
fails with `Missing cached HTML for "<name>"`, so land the refresh PR before (or
with) the case's updated `expected`.
