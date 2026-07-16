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

1. Commit one new file — but **not** the case file yet:
   `dev/requirements/extractor/data/server-fetched/<name>.url` — plain text,
   just the event page URL. This file stays for good: it is the **single source
   of truth** for the page's URL (used by the fetch workflow and by
   `live.test.js`), so the URL is **not** repeated in the case file.
2. Push the branch, then **dispatch `.github/workflows/fetch-page.yml`** on it
   (Actions tab / API) with inputs `case_name=<name>` and `url=<the event URL>`
   (plus `wait_for_selector` when the request carries one). It records the page
   via ScraperAPI and commits `<name>.html` back to the branch with
   `[skip ci]`; `test:live` stays green because no case asserts it yet. The
   workflow is dispatched **per page, never a bulk refresh**, and its commit
   only touches `data/**`, which `test.yml`'s `paths-ignore` skips.
3. Pull, then add `dev/requirements/extractor/expected/<name>.json` (same
   `<name>`, just `description` + `expected`, no `url`) and run
   `npm run test:live` — it now runs against the local cached HTML, so its
   output gives you the exact `expected` to paste in. Commit and push.

`expected.events` is the **complete, exact** array the extractor produces —
deep-equal on `title`, `start`, `end`, `location`, `ctz`, and `details`, no
matchers, array length included (one event for an ordinary page, several for a
listing/series page). See `live.test.js`'s header for how each field derives.

**Gardening:** when an event page is eventually taken down, point
`<name>.url` at a newer event and refresh its cached HTML the same way. Until a
cached HTML file exists for a case, `test:live` (and the Tests workflow) fails
with `Missing cached HTML for "<name>"`.
