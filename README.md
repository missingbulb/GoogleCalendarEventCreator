# Google Calendar Event Creator

A Chrome extension that adds a toolbar button which, when clicked, reads event
details from the current web page and shows a small popup with a summary of
what was found. Clicking the popup's button opens a pre-filled Google
Calendar event (via
`https://calendar.google.com/calendar/render?action=TEMPLATE`) — no API keys
or OAuth needed. You review the pre-filled event and hit Save.

## What it extracts

- **Event name** (`text`)
- **Date and time** (`dates`) — timed, all-day, or omitted if none found
- **Location** (`location`)
- **Details** (`details`) — the event description plus a link back to the
  source page

An event is created with whatever subset of these is available; missing fields
are simply left for you to fill in on the Google Calendar screen.

## How extraction works

Extraction runs in three layers, merged field-by-field (first non-empty wins):

1. **Site-specific scrapers** with hardcoded selectors for the major event
   sites: **meetup.com**, **facebook.com** events, **eventbrite.com**,
   **edfringe.com** (Edinburgh Festival Fringe), and **cinema.co.il** (Tel
   Aviv Cinematheque). Each lives in its own file under `extractors/` with a
   comment describing the HTML it expects; to support a new platform, add a
   file there following the same pattern and list it in `EXTRACTOR_FILES` in
   `background.js`.
2. **schema.org JSON-LD** (`<script type="application/ld+json">` with an
   `Event` type) — most event pages publish this, so it's the strongest
   generic signal.
3. **Generic heuristics** for any other page: microdata
   (`itemprop="startDate"` etc.), Open Graph / meta tags, `<time datetime>`
   elements, `<h1>`/`<address>` tags, venue/location-named elements, and
   finally a date/time pattern scan over the page's visible text
   ("June 14, 2026 at 7 PM", "14 June 2026, 19:30", "6/14/2026", ISO dates, …).

If the page appears to list **multiple events** (several JSON-LD events,
several `schema.org/Event` microdata items, or several timestamped list
cards), the **first event** is suggested and a note is added to the details
field.

Dates with an explicit timezone offset are converted to an exact UTC instant
before being passed to Google Calendar, so the event occurs at the same
moment in time regardless of the viewer's own timezone; dates without an
offset are passed as floating local times so the event shows the same
wall-clock time the page displayed. When no end time is found, a 2-hour
duration is assumed. A date without a time becomes an all-day event.

A site extractor that knows an event's location is fixed (e.g. a festival
that only ever runs in one city) can set `ctz` to that timezone (e.g. `"GB"`
for the Edinburgh Festival Fringe); it's passed straight through as the
Calendar URL's `ctz` parameter, so a floating start/end time is interpreted
in that timezone rather than the viewer's own.

## Install (developer mode)

1. Get the code onto your machine, either:
   - Clone this repository: `git clone https://github.com/missingbulb/GoogleCalendarEventCreator.git`, or
   - If you don't have `git`, download
     [the `main` branch as a ZIP](https://github.com/missingbulb/GoogleCalendarEventCreator/archive/refs/heads/main.zip)
     and extract it (it unpacks into a `GoogleCalendarEventCreator-main` folder).
2. Open `chrome://extensions` in Chrome.
3. Enable **Developer mode** (top right).
4. Click **Load unpacked** and select the folder from step 1 (the one
   containing `manifest.json`).
5. Optionally pin the extension's calendar icon to the toolbar.

To pick up later changes, re-download/pull and click the refresh icon on the
extension's card in `chrome://extensions`.

## Use

Navigate to a page describing an event and click the extension's toolbar
button. A small popup opens showing the event title, date/time, and location
that were found on the page. Click **Add to Google Calendar** to open a new
tab with the Google Calendar "create event" screen pre-filled; review and
save.

## Testing

There are three kinds of tests, with different audiences, separated under
`test/integration/`, `test/unit/`, and `test/ui/`:

```sh
npm install
npm run test:live      # integration: the REVIEWED assertions for each supported site
npm run test:offline   # unit: internal tests of the extraction logic
npm run test:ui        # UI: rendered popup vs. the stored snapshot image
npm run refresh        # re-fetch the live snapshots (needs internet)
npm run refresh:ui     # regenerate the popup UI snapshot after an intentional change
npm test               # everything above (offline + live + UI)
```

### Integration tests — the ones you review

**`test/integration/live.test.js`** is driven by declarative JSON files in
`test/integration/cases/` — a real event page URL plus the values the
extractor must produce for it. These are the assertions a human reviews to
confirm each site is handled correctly.

```json
{
  "description": "Meetup event page is parseable",
  "url": "https://www.meetup.com/nyctechmixer/events/311245599/",
  "expected": {
    "title": "NYC Tech Mixer 2026",
    "start": "2026-06-25T18:00:00-04:00",
    "location": "The Williamsburg Hotel Bar, 96 Wythe Ave, Brooklyn, NY",
    "description": { "includes": ["JOIN US FOR THE BEST NETWORKING EVENT"] }
  }
}
```

Each expected field takes an exact string/boolean, or a matcher:
`{ "includes": [...] }`, `{ "matches": "regex" }`, or `{ "nonEmpty": true }`.
Use exact values when the value is known and stable; use matchers otherwise.
All fields are optional.

The tests themselves run **offline**, against committed HTML snapshots in
`test/integration/snapshots/` (one `<case>.html` per case, plus
`manifest.json` recording each snapshot's source URL and fetch time). The
snapshot is loaded into a DOM at the case's URL — so hostname-based site
detection behaves exactly as in Chrome — and run through the real extractor
files. This keeps the suite deterministic and runnable anywhere, while still
reflecting each site's *current* markup, because the snapshots are kept fresh
by a separate workflow:

- **`test/integration/refresh-snapshots.js`** (`npm run refresh`) re-fetches
  any snapshot that is missing, older than 24h, or whose case URL changed
  (`--force` does all of them). A failed fetch keeps the previous snapshot and
  only warns, so a site outage or bot-blocking never breaks the suite.
- The **Tests** workflow (`.github/workflows/test.yml`) runs on every PR and
  push to `main`: it runs the unit tests, then the integration tests against
  the HTML snapshots **already committed** in `test/integration/snapshots/`
  — it never fetches or refreshes anything itself, so it's fast and has no
  network dependency.
- The **Refresh snapshots** workflow (`.github/workflows/refresh-snapshots.yml`)
  runs daily (and on demand via "Run workflow"), force-refreshes every
  snapshot, runs the integration tests, and commits the result — so a site
  changing its markup turns a scheduled run red within a day, independently of
  anyone pushing. It's the *only* thing that fetches live pages and commits
  snapshots, which keeps the Tests workflow simple and rules out any
  refresh→commit→refresh loop.

The snapshot commit is pushed with the default `GITHUB_TOKEN` (whose pushes
never trigger another workflow run), carries a `[skip ci]` marker, and the
Tests workflow ignores pushes that only touch
`test/integration/snapshots/**` — belt-and-suspenders against that commit
ever re-triggering CI.

**To cover a new website or platform, add one case file** pointing at a real
event page, then **record its snapshot before relying on the integration
test**. The expected sequence is:

1. Add the extractor (if needed) and the new case file under
   `test/integration/cases/`, then commit that change.
2. Run `npm run refresh` locally on the same branch (needs internet) — this
   is the same `refresh-snapshots.js` step the **Refresh snapshots** workflow
   runs, and it fetches the new case's HTML and updates
   `test/integration/snapshots/manifest.json` accordingly.
3. Commit the resulting files under `test/integration/snapshots/` as a
   follow-up commit on the branch.

Until a snapshot exists for the new case, `test:live` (and so the Tests
workflow) will fail with `Missing snapshot for "<case>"`. Note that cases also
need occasional gardening: when an event page is eventually taken down, point
its case at a newer event (and refresh its snapshot the same way).

### Unit tests — the internal safety net

**`test/unit/extraction.test.js`** pins down the extraction logic (site
selectors, JSON-LD handling, text date parsing, multiple-event detection) and
**`test/unit/calendar-url.test.js`** covers the Google Calendar URL building
(`dates` formats, the `details` field layout). Both use small synthetic
HTML snippets written inline — no network, never flake — so a regression is
caught on every PR even when a third-party site or its snapshot is
unavailable.

Facebook extraction is covered only here: GitHub Actions runners get HTTP 400
from facebook.com, so it can't be snapshotted as a live case.

### UI snapshot test

**`test/ui/popup.test.js`** renders an approximation of the popup
(`test/ui/render.js`, using `satori` + `@resvg/resvg-js` — no browser) for
fixed fixture data (`test/ui/fixture.js`), and compares it pixel-by-pixel
(via `pixelmatch`) against the committed image at
**`test/ui/snapshots/popup.png`** — open that file on GitHub to see what the
popup currently looks like.

Note this is **not a screenshot of the real `popup.html`**: satori only
supports a constrained flexbox-based HTML/CSS subset, so `render.js` is a
hand-maintained tree mirroring `popup.html`'s structure and styles. If
`popup.html`/`popup.css`/`popup.js` change in ways that affect the rendered
output (copy, layout, colors), update `buildTree()` in `render.js` to match.
This tradeoff was chosen for determinism and zero extra runtime
dependencies (no browser download); a real-browser screenshot (e.g. via
Playwright) would have higher fidelity but couldn't run in all environments
— revisit if the approximation's fidelity becomes a problem.

Rendering is deterministic, so this is fast and dependency-light enough to
run as part of `npm test`/`test:ui` everywhere, with no separate CI job or
browser install step.

After an intentional change to the popup's UI, run `npm run refresh:ui` to
regenerate `popup.png` (or use the **Refresh UI snapshot** workflow, "Run
workflow" in the Actions tab) and commit the updated PNG so reviewers can see
the before/after in the diff. On mismatch, the test writes
`test/ui/snapshots/popup.actual.png` and `popup.diff.png` (both gitignored)
for local debugging.

### Toolbar icon test

**`test/ui/icon.test.js`** generates the expected 128x128 toolbar icon for
both states described in `icon-state.js` — a green border for pages with a
site-specific extractor and a red border otherwise — using
`test/ui/render-icon.js` (a JS port of `tools/gen_icons.py`'s `make_icon()`,
no browser). Each generated image is compared pixel-by-pixel against the
committed reference images **`test/ui/snapshots/icon-red.png`** and
**`test/ui/snapshots/icon-green.png`** (browsable on GitHub) — the same
red-bordered / green-bordered icons shown in the toolbar for unsupported and
supported pages — and, as a cross-check, against the actual shipped
`icons/icon128-red.png` / `icons/icon128-green.png`.

After an intentional change to `tools/gen_icons.py` / `render-icon.js`, run
`npm run refresh:ui` to regenerate `icon-red.png` and `icon-green.png` (and
re-run `python3 tools/gen_icons.py` to regenerate the shipped icons) and
commit the results. On mismatch, the test writes
`test/ui/snapshots/icon-{red,green}.actual.png` and
`icon-{red,green}.diff.png` (gitignored) for local debugging.

## Files

| File            | Purpose                                                       |
| --------------- | ------------------------------------------------------------- |
| `manifest.json` | Manifest V3 definition (`activeTab` + `scripting` + `tabs` permissions) |
| `popup.html`, `popup.js` | Toolbar popup: runs the extractor, shows a summary, and opens the URL on click |
| `background.js` | Shared library: builds the pre-filled Google Calendar URL     |
| `icon-state.js` | Background service worker: updates the toolbar icon's border color per tab |
| `extractors/lib.js` | Shared helpers (DOM, date parsing, merging) + site registry |
| `extractors/site-hosts.js` | Hostname matchers shared between the site extractors and `icon-state.js` |
| `extractors/meetup.js`, `facebook.js`, `eventbrite.js`, `edinburghfringe.js`, `cinema.js` | One file per supported event site, with hardcoded selectors |
| `extractors/jsonld.js` | schema.org JSON-LD extraction                          |
| `extractors/generic.js` | Heuristics for any page + multiple-event detection    |
| `extractors/main.js` | Entry point: picks extractors, merges results            |
| `test/integration/cases/`   | Reviewed live-test cases (URL + expected values), one JSON each |
| `test/integration/snapshots/` | Committed HTML snapshots the live tests assert against, kept fresh by CI |
| `test/integration/refresh-snapshots.js` | Re-fetches stale/missing snapshots          |
| `test/integration/live.test.js` | Runs the reviewed assertions against the snapshots       |
| `test/unit/extraction.test.js`, `test/unit/calendar-url.test.js` | Internal offline unit tests |
| `test/harness.js` | Shared test harness (loads extractors into a jsdom DOM) |
| `test/ui/fixture.js` | Fixed extraction result + tab info used to render the popup deterministically |
| `test/ui/load-popup.js` | Loads pure helpers (e.g. `formatWhen`) from `popup.js` for use in `render.js` |
| `test/ui/render.js` | Renders an approximation of the popup to PNG via satori + resvg (no browser) |
| `test/ui/fonts/` | Bundled Liberation Sans font files used by the renderer (OFL-licensed) |
| `test/ui/popup.test.js` | Compares the rendered popup against the stored snapshot |
| `test/ui/refresh-snapshot.js` | Regenerates `test/ui/snapshots/popup.png`              |
| `test/ui/snapshots/popup.png` | Committed reference image of the popup, browsable on GitHub |
| `test/ui/render-icon.js` | Renders the expected toolbar icon (green/red border) to PNG, no browser |
| `test/ui/icon.test.js` | Compares the rendered toolbar icon for each state against the stored snapshots and `icons/icon128-{green,red}.png` |
| `test/ui/refresh-icon-snapshot.js` | Regenerates `test/ui/snapshots/icon-{red,green}.png` |
| `test/ui/snapshots/icon-red.png`, `icon-green.png` | Committed reference images of the toolbar icon for unsupported/supported pages, browsable on GitHub |
| `tools/gen_icons.py` | Regenerates the PNG icons (Python stdlib only)           |

## Permissions

`activeTab` and `scripting`: the extension can read a page solely when you
click the button on it, and sends nothing anywhere — it just opens a Google
Calendar URL in a new tab.

`tabs`: lets `icon-state.js` see each tab's URL (hostname only) so it can
show the toolbar icon with a green border on pages with a site-specific
extractor (e.g. meetup.com) and a red border elsewhere.
