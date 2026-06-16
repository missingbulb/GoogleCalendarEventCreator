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

### Fallback-coverage gate — how the generic extractor stacks up

**`test/integration/fallback-coverage.test.js`** (part of `test:live`) measures
what the generic **fallback** extractor (`pipeline/extract-unsupported.js`)
recovers on each cached case page, relative to that page's **dedicated source**
— the reviewed-correct ground truth. The comparison logic lives in
**`test/fallback-coverage.js`**: it runs `GCal.extract()` twice on the same HTML
— once normally, once with `GCal.sources` emptied (the documented way to force
the unsupported-host path) — and grades the fallback's **primary event**
(`events[0]` after the chronological sort) field-by-field against the custom
one, counting a field only when the dedicated source filled it.

It produces two gated percentages — **critical fields** (title + start +
location, the popup's presentability threshold) and **all fields** — plus an
informational event-coverage number (the fallback can't enumerate a listing
page). `start`/`end` count as a match when byte-identical **or** the same
absolute instant, so a source's `ctz`-localized floating time isn't scored as a
miss against the fallback's offset-bearing instant (a floating time read an hour
off, or one that dropped its time, still is).

The two percentages are a **high-watermark gate** stored in
`test/integration/fallback-coverage.baseline.json`: the test fails if either
drops below its watermark, and ratchets the watermark **up** when the fallback
improves. So a change that quietly makes the generic extractor worse (or better)
shows up here. Running locally also rewrites the human-readable
**`docs/fallback-coverage.md`** report (per-host, per-field-type, and per-case
tables, plus the notable value differences) — commit it like the UI snapshots;
the test only writes the working tree, it never touches git. In CI the refresh
is a no-op (the committed report and baseline are the reviewed truth). Because it
runs against the cached HTML, a `data/` refresh that legitimately moves a
source's output can move these numbers — re-baseline by hand (lower the number
in the baseline file) when that's the intended cause.

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

**`test/ui/popup-snapshots.test.js`** renders each of the popup's five states
and compares it pixel-by-pixel (via `pixelmatch`) against a committed image.
The states are authored once, as static markup, in **`ui/views/popup-states.html`**
— the single visual reference; open it (or the PNGs below) on GitHub to see what
the popup currently looks like:

- **`popup-state-1-supported.png`** — supported host: the extractor's events (a 2-event listing).
- **`popup-state-2-denylisted.png`** — denylisted host: "No events found", no link or prompt.
- **`popup-state-3-nothing-found.png`** — not denylisted, nothing complete found: "No events found" + a "Disagree?" policy link.
- **`popup-state-4-allowlisted.png`** — a complete fallback event, allowlisted: the event only.
- **`popup-state-5-unlisted.png`** — a complete fallback event, on neither list: the event + a "request support" button.

`test/ui/popup-renderer.js` renders each `.popup` block with `satori` +
`@resvg/resvg-js` (no browser). satori has no CSS engine, so the renderer folds
the **real `ui/popup.css`** onto the markup as inline styles first (parse rules,
match with jsdom, inline every declaration) — one source of truth for the
styling, no values duplicated in the states file. Nothing is cherry-picked:
satori ignores what it doesn't use; the only adjustment is its one structural
rule (a box with element children needs an explicit `display`) and swapping in
the bundled font.

Note this is **not a screenshot of the real popup**: satori supports a
constrained flexbox-based HTML/CSS subset. The tradeoff buys determinism and
zero extra runtime dependencies (no browser download); a real-browser
screenshot (e.g. via Playwright) would have higher fidelity but couldn't run in
all environments — revisit if the approximation's fidelity becomes a problem.

Rendering is deterministic, so this is fast and dependency-light enough to run
as part of `npm test`/`test:ui` everywhere, with no separate CI job or browser
install step.

After an intentional change to the popup — its markup (`ui/views/popup-states.html`,
and the real views it mirrors) or its styling (`ui/popup.css`) — run
`npm run refresh:ui` to regenerate the five `popup-state-*.png` images and commit
them so reviewers see the before/after in the diff. On mismatch, the test writes
`<name>.actual.png` and `<name>.diff.png` to `test/ui/.artifacts/` (gitignored;
see `test/ui/snapshot-artifacts-dir.js`) and prints their full paths.
