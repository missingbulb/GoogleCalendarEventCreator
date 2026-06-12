# Google Calendar Event Creator

A Chrome extension that adds a toolbar button which, when clicked, reads event
details from the current web page and opens a pre-filled Google Calendar event
(via `https://calendar.google.com/calendar/render?action=TEMPLATE`) — no API
keys or OAuth needed. You review the pre-filled event and hit Save.

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
   sites: **meetup.com**, **facebook.com** events, and **eventbrite.com**.
   Each lives in its own file under `extractors/` with a comment describing
   the HTML it expects; to support a new platform, add a file there following
   the same pattern and list it in `EXTRACTOR_FILES` in `background.js`.
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

Dates with an explicit timezone offset are passed to Google Calendar as the
page's wall-clock time plus a `ctz` parameter for the matching timezone, so
the event keeps the same time regardless of the viewer's own timezone; dates
without an offset are passed as floating local times so the event shows the
same wall-clock time the page displayed. When no end time is found, a 2-hour
duration is assumed. A date without a time becomes an all-day event.

## Install (developer mode)

1. Clone this repository.
2. Open `chrome://extensions` in Chrome.
3. Enable **Developer mode** (top right).
4. Click **Load unpacked** and select the repository folder.
5. Optionally pin the extension's calendar icon to the toolbar.

## Use

Navigate to a page describing an event and click the extension's toolbar
button. A new tab opens with the Google Calendar "create event" screen
pre-filled; review and save.

## Testing

There are two kinds of tests, with different audiences, separated under
`test/integration/` and `test/unit/`:

```sh
npm install
npm run test:live      # integration: the REVIEWED assertions for each supported site
npm run test:offline   # unit: internal tests of the extraction logic
npm run refresh        # re-fetch the live snapshots (needs internet)
npm test               # everything
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
test**: either run `npm run refresh` locally (needs internet), or trigger the
**Refresh snapshots** workflow manually ("Run workflow" in the Actions tab).
Until a snapshot exists for the new case, `test:live` (and so the Tests
workflow) will fail with `Missing snapshot for "<case>"`. Note that cases also
need occasional gardening: when an event page is eventually taken down, point
its case at a newer event (and refresh its snapshot the same way).

### Unit tests — the internal safety net

**`test/unit/extraction.test.js`** pins down the extraction logic (site
selectors, JSON-LD handling, text date parsing, multiple-event detection) and
**`test/unit/calendar-url.test.js`** covers the Google Calendar URL building
(`dates`/`ctz` formats, the `details` field layout). Both use small synthetic
HTML snippets written inline — no network, never flake — so a regression is
caught on every PR even when a third-party site or its snapshot is
unavailable.

Facebook extraction is covered only here: GitHub Actions runners get HTTP 400
from facebook.com, so it can't be snapshotted as a live case.

## Files

| File            | Purpose                                                       |
| --------------- | ------------------------------------------------------------- |
| `manifest.json` | Manifest V3 definition (`activeTab` + `scripting` permissions) |
| `background.js` | Service worker: runs the extractor, builds and opens the URL  |
| `extractors/lib.js` | Shared helpers (DOM, date parsing, merging) + site registry |
| `extractors/meetup.js`, `facebook.js`, `eventbrite.js` | One file per supported event site, with hardcoded selectors |
| `extractors/jsonld.js` | schema.org JSON-LD extraction                          |
| `extractors/generic.js` | Heuristics for any page + multiple-event detection    |
| `extractors/main.js` | Entry point: picks extractors, merges results            |
| `test/integration/cases/`   | Reviewed live-test cases (URL + expected values), one JSON each |
| `test/integration/snapshots/` | Committed HTML snapshots the live tests assert against, kept fresh by CI |
| `test/integration/refresh-snapshots.js` | Re-fetches stale/missing snapshots          |
| `test/integration/live.test.js` | Runs the reviewed assertions against the snapshots       |
| `test/unit/extraction.test.js`, `test/unit/calendar-url.test.js` | Internal offline unit tests |
| `test/harness.js` | Shared test harness (loads extractors into a jsdom DOM) |
| `tools/gen_icons.py` | Regenerates the PNG icons (Python stdlib only)           |

## Permissions

Only `activeTab` and `scripting`: the extension can read a page solely when
you click the button on it, and sends nothing anywhere — it just opens a
Google Calendar URL in a new tab.
