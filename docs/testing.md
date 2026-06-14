# Testing

There are three kinds of tests, with different audiences, separated under
`test/integration/`, `test/unit/`, and `test/ui/`:

```sh
npm install
npm run test:live      # integration: the REVIEWED assertions for each supported site
npm run test:offline   # unit: internal tests of the extraction logic
npm run test:ui        # UI: rendered popup vs. the stored snapshot image
npm run refresh        # fetch any missing cached HTML files (needs internet)
npm run refresh:ui     # regenerate the popup UI snapshot after an intentional change
npm test               # everything above (offline + live + UI)
```

### Integration tests — the ones you review

**`test/integration/live.test.js`** is driven by declarative JSON files in
`test/integration/cases/` — the values the extractor must produce for a page.
These are the assertions a human reviews to confirm each site is handled
correctly.

```json
{
  "description": "Meetup event page is parseable",
  "expected": {
    "events": [
      {
        "title": "NYC Tech Mixer 2026",
        "start": "2026-06-25T18:00:00",
        "end": "2026-06-25T21:00:00",
        "location": "The Williamsburg Hotel Bar, 96 Wythe Ave, Brooklyn, NY",
        "ctz": "America/New_York",
        "details": "[https://www.meetup.com/...](https://www.meetup.com/.../)\n\n...full description..."
      }
    ]
  }
}
```

`expected.events` is the **complete, exact** array the extractor produces: each
event is deep-equal compared on `title`, `start`, `end`, `location`, `ctz`, and
`details` (no matchers — every field must match exactly, including the full
`details`). The array length also pins down how many events were found: one for
an ordinary page, several for a listing/series page. See the header comment in
`live.test.js` for how each field is derived.

The case's **source URL is not in the case file** — it lives next to the cached
HTML, in `data/<name>.url` (a plain-text file holding just the URL). That one
file is the single source of truth for the page's URL: `refresh-cache.js`
fetches it, and the live test loads the cached HTML into a DOM at that URL.
Keeping it out of the reviewed case file means a test (`description` +
`expected`) and the fetch/provenance record stay separate concerns.

The tests themselves run **offline**, against committed cached HTML files in
`data/` (one `<name>.html` and one `<name>.url` per case). The cached HTML is
loaded into a DOM at the `.url` file's URL — so hostname-based site detection
behaves exactly as in Chrome — and run through the real extractor files. This
keeps the suite deterministic and runnable anywhere, while still reflecting each
site's markup at the time it was recorded:

- **`data/refresh-cache.js`** (`npm run refresh`) fetches any cached HTML file
  that is missing or empty (zero bytes). A failed fetch keeps the previous
  cached HTML file and only warns, so a site outage or bot-blocking never breaks
  the suite.
- The **Tests** workflow (`.github/workflows/test.yml`) runs on every PR and
  push to `main`: it runs the unit tests, then the integration tests against
  the cached HTML files **already committed** in `data/` — it never fetches or
  refreshes anything itself, so it's fast and has no network dependency.
- The **Refresh cached HTML files** workflow
  (`.github/workflows/refresh-cache.yml`) **runs automatically** when you push a
  branch (other than `main`) that adds or removes a `data/` file: it records any
  missing or empty cached HTML, runs the integration tests, and commits the
  result back to the branch. (It's also runnable from the Actions tab, and the
  auto-implement-extractor workflow dispatches it explicitly — its `GITHUB_TOKEN`
  push doesn't fire the push trigger.) It's the *only* thing that fetches live
  pages and commits cached HTML, which keeps the Tests workflow simple. To
  re-record a cached file that already exists — e.g. when a site changes its
  markup — delete `data/<name>.html` on your branch and push; the now-missing
  file is refetched like any other.

The cached-HTML commit is pushed with the default `GITHUB_TOKEN` (whose pushes
never trigger another workflow run), carries a `[skip ci]` marker, and the
Tests workflow ignores pushes that only touch `data/**` — belt-and-suspenders
against that commit ever re-triggering CI.

**To cover a new website or platform, add per-case files only** — there's no
shared index to edit, so parallel branches never collide. The expected
sequence is:

1. Add the extractor (if needed), a `data/<name>.url` with the event page URL,
   and the new case file (`test/integration/cases/<name>.json`) with its
   `expected`. Commit that change.
2. Run `npm run refresh` locally on the same branch (needs internet) — this
   is the same `refresh-cache.js` step the **Refresh cached HTML files**
   workflow runs, and it fetches the new page's HTML from `data/<name>.url`.
3. Commit the resulting `data/<name>.html` as a follow-up commit on the branch.

Until a cached HTML file exists for the new case, `test:live` (and so the Tests
workflow) will fail with `Missing cached HTML for "<name>"`. Note that cases
also need occasional gardening: when an event page is eventually taken down,
point `data/<name>.url` at a newer event (and refresh its cached HTML the same
way).

### Unit tests — the internal safety net

**`test/unit/extraction.test.js`** pins down the extraction logic (site
selectors, JSON-LD handling, text date parsing, multiple-event detection) and
**`test/unit/calendar-url.test.js`** covers the Google Calendar URL building
(`dates` formats, the `details` field layout). Both use small synthetic
HTML snippets written inline — no network, never flake — so a regression is
caught on every PR even when a third-party site or its cached HTML is
unavailable.

Facebook extraction is covered only here: GitHub Actions runners get HTTP 400
from facebook.com, so it can't be cached as a live case.

### UI snapshot test

**`test/ui/popup-snapshots.test.js`** renders approximations of the popup
(`test/ui/popup-renderer.js`, using `satori` + `@resvg/resvg-js` — no browser) for
fixed fixture data (`test/ui/popup-fixtures.js`), and compares each pixel-by-pixel
(via `pixelmatch`) against a committed image. Two layouts are covered — open
them on GitHub to see what the popup currently looks like:

- **`test/ui/snapshots/popup-single-event.png`** — a single-event page: one ~60px
  "Add to Google Calendar" button.
- **`test/ui/snapshots/popup-multi-event.png`** — a listing/series page: one ~60px
  button per event (6 here) under an "N events on this page" heading.

Note this is **not a screenshot of the real popup**: satori only
supports a constrained flexbox-based HTML/CSS subset, so `popup-renderer.js` is a
hand-maintained tree mirroring `ui/popup.css`'s styles and the
`ui/views/events-view.js` button layout. If the popup's markup/CSS or the
events-view rendering change in ways that affect the rendered output (copy,
layout, colors), update `buildTree()` in `popup-renderer.js` to match.
This tradeoff was chosen for determinism and zero extra runtime
dependencies (no browser download); a real-browser screenshot (e.g. via
Playwright) would have higher fidelity but couldn't run in all environments
— revisit if the approximation's fidelity becomes a problem.

Rendering is deterministic, so this is fast and dependency-light enough to
run as part of `npm test`/`test:ui` everywhere, with no separate CI job or
browser install step.

After an intentional change to the popup's UI, run `npm run refresh:ui` to
regenerate both `popup-single-event.png` and `popup-multi-event.png` and commit
the updated PNGs so reviewers can see the before/after in the diff. On mismatch, the test
writes `<name>.actual.png` and `<name>.diff.png` to `test/ui/.artifacts/`
(gitignored; see `test/ui/snapshot-artifacts-dir.js`) and prints their full paths.
