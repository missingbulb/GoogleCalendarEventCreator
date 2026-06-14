# Workflow

For every new task in this repo:

1. Create a GitHub issue describing the task before starting work.
2. Reference that issue number in commit messages (e.g. `Refs #123` or
   `Fixes #123`).
3. Update the issue's status (comments / close) as work progresses and
   when it's done.

When the repo owner says "LGTM" on a change, treat it as approval to merge
that branch's pull request into `main`.

# Adding a site extractor

Extraction merges three layers (site-specific → schema.org JSON-LD → generic
heuristics), first non-empty value per field winning — see
`extractors/main.js`. So a new site extractor only needs to supply the fields
the generic/JSON-LD layers get wrong or miss. The flow:

1. Register the hostname in `GCal.siteHosts` in `extractors/site-hosts.js`.
   This file is DOM-free and shared: it both gates the site extractor and
   drives the green ("supported") vs. red toolbar icon, so adding here is what
   makes a page count as supported.
2. Add `extractors/<site>.js` that pushes onto `GCal.sites` with `name`,
   `matches` (reuse the `siteHosts` entry), and an `extract()` returning a
   partial event object. Follow `extractors/meetup.js` as the template,
   including the header comment describing the HTML it expects. Use the shared
   helpers on `GCal` (see `extractors/lib.js`); return only the fields this
   site needs.
3. List the new file in `EXTRACTOR_FILES` in `background.js` — after
   `lib.js`/`site-hosts.js`, before `main.js` (which must stay last). This list
   is the single source of truth: the popup injects it and the tests read it.
4. Add an integration case for a real page on the site (see Testing below).

# Testing

`npm test` runs everything; `README.md` "Testing" has the mechanics. Keep
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
