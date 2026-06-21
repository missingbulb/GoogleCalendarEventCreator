# Testing

There are three kinds of tests, with different audiences, separated under
`test/extractors/`, `test/extension/`, `test/unit/`, and `test/ui/`:

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

**`test/extractors/live.test.js`** is driven by declarative JSON files in
`test/extractors/custom/` — the values the extractor must produce for a page.
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
   and the new case file (`test/extractors/custom/<name>.json`) with its
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

**`test/extractors/fallback/fallback-coverage.test.js`** (part of `test:live`) measures
what the generic **fallback** extractor (`extension/pipeline/extract-unsupported.js`)
recovers on each cached case page, relative to that page's **dedicated source**
— the reviewed-correct ground truth. The comparison logic lives in
**`test/extractors/fallback/fallback-coverage.js`**: it runs `GCal.extract()` twice on the same HTML
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
`test/extractors/fallback/fallback-coverage.baseline.GENERATED.json`, which holds the percentages
**plus the list of `cases` they were computed over**. The gate compares the
current run to the watermark over the cases they **share**, so a newly added case
(absent from `cases`) is excluded and **adding an extractor never fails the
gate** (#240) — while a pre-existing case that regresses still does. The watermark
**ratchets up** on an unchanged case set, and **re-anchors** to the current
aggregate when the set changes (a new/removed case, or a `data/` refresh that
moves a source's ground truth). A removed/renamed case the watermark still lists
makes it stale: the local refresh re-anchors it (commit that); in CI it's an
error to fix. *Caveat:* with a single aggregate watermark, a regression bundled
into the same change as a case-set change can be re-anchored over rather than
caught — don't commit a re-anchored baseline while the gate is red.

Running locally also rewrites the human-readable **`test/extractors/fallback/fallback-coverage.GENERATED.md`**
report (headline score, the shared-subset gate, and per-host / per-field-type /
per-case tables — the per-case matrix stays committed so a gate failure shows
which case/field regressed without re-running the old code) — commit it like the
UI snapshots; the test only writes the working tree, it never touches git. The
actual mismatched values are **printed as test output** (local and CI), not
committed — reference material for improving the fallback. In CI the file refresh
is a no-op (the committed report and baseline are the reviewed truth).
Because it
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

**`test/ui/popup-snapshots.test.js`** is the single visual-comparison engine: it
renders each UI *case* and compares it pixel-by-pixel (via `pixelmatch`) against a
committed image. `test/ui/render-snapshot.js` picks the renderer by the **case's own
`kind`**: a `"popup"` case (the default) is fed to `extension/ui/popup.js`'s exported
`render({ data, tab, listing })` — the same `chooseContent` +
`events-view.js`/`source-request-view.js` code the extension runs — and a
`"icon"` case (§10, the toolbar icon) is fed to the real `extension/ui/toolbar-icon.js`
loaded into a fake browser (`icon-renderer.js` + `fake-chrome.js`). Either way the
pixels come from shipped code, so a change to a view or to the icon is caught
automatically; the comparison, naming, storage, and refresh are shared. (`render()`
is split out of `init()` for exactly this: init does the chrome/fetch I/O to gather
the data, render builds the DOM from it.)

Each case is a self-contained tuple in **`test/ui/cases/`**, one per leaf
requirement: a `req-<id>.case.js` whose filename names the single
[`uiRequirements.md`](uiRequirements.md) leaf it pins, minimal data isolating that
one requirement. For the current set with every reference image shown in a
two-column table beside its requirement (image left, spec right), see the
generated gallery in **[`uiRequirements.md`](uiRequirements.md)** — it's derived
from the cases (so it can't drift) and is the one-page review surface.

A popup `req-<id>.case.js` exports `{ description, data, listing?, tab?, action? }`.
`data` is the fake extraction result (`{ supported, events: [...] }`); `listing` is
the host classification (`none`/`allow`/`deny`); `action` is an optional
`(document) => void` gesture applied before snapshotting — e.g. `scrollToBottom`
from `test/ui/actions.js`, since satori can't actually scroll (it pins `#events`
to its end so the bottom-anchored count label is painted). An icon case
(`kind: "icon"`) instead exports `{ kind, description, tabUrl, lists }` — the faked
active-tab URL and host lists the toolbar-icon renderer classifies.

`test/ui/popup-renderer.js` rasterizes with `satori` + `@resvg/resvg-js` (no
browser). satori has no CSS engine, so the renderer folds the **real
`extension/ui/popup.css`** onto the rendered DOM as inline styles first (parse rules, match
with jsdom, inline every declaration) — one source of truth for the styling, no
duplicated values. Nothing is cherry-picked: satori ignores what it doesn't use;
the only adjustments are its one structural rule (a box with element children
needs an explicit `display`) and swapping in the bundled font. Two non-obvious
constraints: resvg panics on a very tall SVG, so the renderer prunes event rows
outside the visible window before rasterizing (they're clipped anyway); and the
date/time copy is locale-sensitive, so snapshots are authored in **en-US** (a
guard test enforces it). See `docs/claude/testing.md` for both.

Note this is **not a screenshot of the real popup**: satori supports a
constrained flexbox-based HTML/CSS subset. The tradeoff buys determinism and
zero extra runtime dependencies (no browser download); a real-browser
screenshot (e.g. via Playwright) would have higher fidelity but couldn't run in
all environments — revisit if the approximation's fidelity becomes a problem.

Rendering is deterministic, so this is fast and dependency-light enough to run
as part of `npm test`/`test:ui` everywhere, with no separate CI job or browser
install step.

After an intentional change to the popup — its views (`extension/ui/popup.js`,
`extension/ui/views/*.js`) or its styling (`extension/ui/popup.css`) — run `npm run refresh:ui` to
regenerate the `test/ui/cases/*.png` images and commit them so reviewers see the
before/after in the diff. On mismatch, the test writes `<name>.actual.png` and
`<name>.diff.png` to `test/ui/.artifacts/` (gitignored; see
`test/ui/snapshot-artifacts-dir.js`) and prints their full paths.
