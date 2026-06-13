# Google Calendar Event Creator

A Chrome extension that adds a toolbar button which, when clicked, reads event
details from the current web page and shows a small popup listing what was
found — one button per event when the page describes several. Clicking a
button opens a pre-filled Google Calendar event (via
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

The extractor always returns a list of events (`{ events: [...] }`), each one
self-described (title, date/time, location, description, timezone). When a
page describes **several distinct events** — a film week or festival listing,
several JSON-LD events, etc. — every event is returned and the popup shows
**one button per event** so you can pick which one to add. An ordinary event
page yields a single event/button; a film that merely has several screening
dates stays one event. The events are ordered by start time, so they read
chronologically regardless of the order the page listed them in.

Dates without a timezone offset are passed as floating local times, so the
event shows the same wall-clock time the page displayed. Dates with an
explicit offset (or trailing `Z`) are converted to an exact UTC instant before
being passed to Google Calendar, so the event occurs at the same moment in time
regardless of the viewer's own timezone. When no end time is found, a 2-hour
duration is assumed. A date without a time becomes an all-day event.

A site extractor that knows an event's location is fixed (e.g. a festival
that only ever runs in one city) can set `ctz` to that timezone (e.g. `"GB"`
for the Edinburgh Festival Fringe); it's passed straight through as the
Calendar URL's `ctz` parameter. When `ctz` is set, an absolute start/end (one
carrying an offset or `Z`) is re-expressed as the floating local wall-clock
time in that timezone — so there's no need to keep it in UTC: the value reads
as the time the event's own city shows, and the `ctz` parameter places it
correctly regardless of the viewer's own timezone.

## Install (developer mode)

Grab the packaged extension — just the files that ship, not the whole repo:

1. Download
   [the latest release zip](https://github.com/missingbulb/GoogleCalendarEventCreator/releases/latest/download/google-calendar-event-creator.zip)
   (`google-calendar-event-creator.zip`, built by the
   [Create Release Package workflow](#creating-a-release-package)) and extract
   it. It unpacks into a folder containing `manifest.json`.
2. Open `chrome://extensions` in Chrome.
3. Enable **Developer mode** (top right).
4. Click **Load unpacked** and select the extracted folder (the one
   containing `manifest.json`).
5. Optionally pin the extension's calendar icon to the toolbar.

To pick up a later release, download the new zip, extract it over the same
folder, and click the refresh icon on the extension's card in
`chrome://extensions`.

If you're **working on the extension**, clone the repo instead
(`git clone https://github.com/missingbulb/GoogleCalendarEventCreator.git`) and
**Load unpacked** the working tree directly — or run `npm run build` to produce
the very same `dist/google-calendar-event-creator.zip` the release serves.

## Use

Navigate to a page describing an event and click the extension's toolbar
button. A small popup opens with a button for each event found on the page,
showing its title, date/time, and location. Click the event you want to open
a new tab with the Google Calendar "create event" screen pre-filled; review
and save.

## Releasing / publishing to the Chrome Web Store

### The package

`npm run build` produces `dist/google-calendar-event-creator.zip` — exactly the
files the extension ships (manifest, scripts, `extractors/`, `icons/`), and
nothing else (no tests, cached HTML, dev tooling, or docs). The file list lives
in **`tools/shipping-files.js`** as the single source of truth, and
`test/unit/shipping-files.test.js` asserts it stays in sync with what the
manifest and popup actually load — so the zip can't silently drop a runtime
file or smuggle in dead weight. This same zip is what testers load unpacked
(see [Install](#install-developer-mode)) and what you upload to the Web Store.

### Versioning

The version users see is `manifest.json`'s `version` (the store reads only
that; `package.json` is kept in sync). **It is bumped deliberately, not
automatically per commit** — it's set when you cut a release (the Release
workflow writes it for you; see below). The store rejects an upload whose
version isn't strictly higher than the live one, so each release must increment
it.

### Creating a release package

The **Create Release Package** workflow (`.github/workflows/release.yml`) sets
the version, runs the tests, builds the zip, and publishes a GitHub Release with
it attached. It does **not** touch the store — pushing to the Chrome Web Store
is a separate, manual step (see below).

- **Run workflow** (Actions tab → Create Release Package → "Run workflow") is
  the normal path. Optionally type the version; **leave it blank to bump the
  current minor version** (`1.0.0` → `1.1.0`). The workflow writes that version
  into `manifest.json` / `package.json`, commits it, tags `vX.Y.Z`, and
  releases.

  > GitHub can't pre-fill the input with a *computed* value — `workflow_dispatch`
  > defaults are static text — so "blank = next minor" is the convenience
  > instead. The version it settled on is printed in the run summary.

- **Push a tag `vX.Y.Z` by hand** if you'd rather bump `manifest.json` yourself.
  The workflow then **verifies the tag matches the manifest version** (a
  mismatch fails the build) before releasing.

Either way the zip is attached under a stable name, so the newest build is
always at a fixed URL:
`…/releases/latest/download/google-calendar-event-creator.zip`.

### Publishing to the store

The **Publish to Chrome Web Store** workflow
(`.github/workflows/publish-chrome-store.yml`) takes the zip from a GitHub
Release and uploads it to the store (publishing to users by default), via the
[Chrome Web Store API](https://developer.chrome.com/docs/webstore/using-api)
(`chrome-webstore-upload-cli`). It's **manual** — run it from the Actions tab
once a release package exists and you're ready to ship: leave the tag blank to
publish the **latest** release, or name a tag; uncheck **auto_publish** to
upload as a draft and publish manually from the dashboard.

It needs four repository secrets (Settings → Secrets and variables → Actions);
the workflow fails fast with a clear message if any are missing:

| Secret | Where it comes from |
| --- | --- |
| `CHROME_EXTENSION_ID` | the item ID in the dashboard URL for the extension |
| `CHROME_CLIENT_ID` | an OAuth client created against the Chrome Web Store API |
| `CHROME_CLIENT_SECRET` | …same OAuth client |
| `CHROME_REFRESH_TOKEN` | generated once for that client |

To mint the OAuth credentials, follow
[`chrome-webstore-upload`'s setup guide](https://github.com/fregante/chrome-webstore-upload/blob/main/How%20to%20generate%20Google%20API%20keys.md)
(enable the Chrome Web Store API in a Google Cloud project, create an OAuth
client, and exchange it for a refresh token), then add the four values as
secrets.

### First publish to the Chrome Web Store

1. Register a developer account at the
   [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
   (one-time \$5 fee).
2. **Add new item** and upload the release zip.
3. Complete the store listing: description, category, a screenshot
   (≥ 1280×800 or 640×400), and the privacy tab — justify each requested
   permission (`activeTab`, `scripting`, `tabs`; see
   [Permissions](#permissions)) and declare data usage (this extension sends
   nothing anywhere).
4. Submit for review. Approval typically takes a few hours to a few days.

### Minor update

1. Make the change (open an issue first per the project workflow) and merge it.
2. Run the **Create Release Package** workflow (blank version = next minor) to
   bump the version and cut the GitHub Release.
3. Run the **Publish to Chrome Web Store** workflow to ship it.

Once the store approves it, Chrome auto-pushes the update to existing users
within a few hours — no reinstall. (For the very first listing, do the one-time
[First publish](#first-publish-to-the-chrome-web-store) steps in the dashboard
first.)

## Testing

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
`test/integration/cases/` — a real event page URL plus the values the
extractor must produce for it. These are the assertions a human reviews to
confirm each site is handled correctly.

```json
{
  "description": "Meetup event page is parseable",
  "url": "https://www.meetup.com/nyctechmixer/events/311245599/",
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

The tests themselves run **offline**, against committed cached HTML files in
`data/` (one `<case>.html` per case, plus `urlsToCacheLocally.json` — a plain
list of the source URL behind each file). The cached HTML is loaded into a DOM
at the case's URL — so hostname-based site detection behaves exactly as in
Chrome — and run through the real extractor files. This keeps the suite
deterministic and runnable anywhere, while still reflecting each site's markup
at the time it was recorded:

- **`data/refresh-cache.js`** (`npm run refresh`) fetches any cached HTML file
  that is missing or whose case URL changed; `--force` re-fetches all of them.
  A failed fetch keeps the previous cached HTML file and only warns, so a site
  outage or bot-blocking never breaks the suite.
- The **Tests** workflow (`.github/workflows/test.yml`) runs on every PR and
  push to `main`: it runs the unit tests, then the integration tests against
  the cached HTML files **already committed** in `data/` — it never fetches or
  refreshes anything itself, so it's fast and has no network dependency.
- The **Refresh cached HTML files** workflow
  (`.github/workflows/refresh-cache.yml`) runs **on demand** (via "Run
  workflow"): it records any missing cached HTML file, runs the integration
  tests, and commits the result. It's the *only* thing that fetches live pages
  and commits cached HTML, which keeps the Tests workflow simple and rules out
  any refresh→commit→refresh loop. To re-record cached files that already
  exist — e.g. when a site changes its markup — run it with the **`force_all`**
  flag checked, which re-fetches every file instead of only the missing ones.

The cached-HTML commit is pushed with the default `GITHUB_TOKEN` (whose pushes
never trigger another workflow run), carries a `[skip ci]` marker, and the
Tests workflow ignores pushes that only touch `data/**` — belt-and-suspenders
against that commit ever re-triggering CI.

**To cover a new website or platform, add one case file** pointing at a real
event page, then **record its cached HTML before relying on the integration
test**. The expected sequence is:

1. Add the extractor (if needed) and the new case file under
   `test/integration/cases/`, then commit that change.
2. Run `npm run refresh` locally on the same branch (needs internet) — this
   is the same `refresh-cache.js` step the **Refresh cached HTML files**
   workflow runs, and it fetches the new case's HTML and updates
   `data/urlsToCacheLocally.json` accordingly.
3. Commit the resulting files under `data/` as a follow-up commit on the
   branch.

Until a cached HTML file exists for the new case, `test:live` (and so the Tests
workflow) will fail with `Missing cached HTML for "<case>"`. Note that cases
also need occasional gardening: when an event page is eventually taken down,
point its case at a newer event (and refresh its cached HTML the same way).

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

**`test/ui/popup.test.js`** renders approximations of the popup
(`test/ui/render.js`, using `satori` + `@resvg/resvg-js` — no browser) for
fixed fixture data (`test/ui/fixture.js`), and compares each pixel-by-pixel
(via `pixelmatch`) against a committed image. Two layouts are covered — open
them on GitHub to see what the popup currently looks like:

- **`test/ui/snapshots/popup.png`** — a single-event page: one ~60px
  "Add to Google Calendar" button.
- **`test/ui/snapshots/popup-multi.png`** — a listing/series page: one ~60px
  button per event (6 here) under an "N events on this page" heading.

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
regenerate both `popup.png` and `popup-multi.png` (or use the **Refresh UI
snapshot** workflow, "Run workflow" in the Actions tab) and commit the updated
PNGs so reviewers can see the before/after in the diff. On mismatch, the test
writes `<name>.actual.png` and `<name>.diff.png` (both gitignored)
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
| `extractors/meetup.js`, `facebook.js`, `eventbrite.js`, `edinburghfringe.js`, `telavivcinematheque.js` | One file per supported event site, with hardcoded selectors |
| `extractors/jsonld.js` | schema.org JSON-LD extraction                          |
| `extractors/generic.js` | Heuristics for any page + multiple-event detection    |
| `extractors/main.js` | Entry point: picks extractors, merges results            |
| `test/integration/cases/`   | Reviewed live-test cases (URL + expected values), one JSON each |
| `data/` | Committed cached HTML files the live tests assert against (plus `urlsToCacheLocally.json`, the list of source URLs) |
| `data/refresh-cache.js` | Fetches any missing cached HTML files          |
| `test/integration/live.test.js` | Runs the reviewed assertions against the cached HTML files |
| `test/unit/extraction.test.js`, `test/unit/calendar-url.test.js` | Internal offline unit tests |
| `test/harness.js` | Shared test harness (loads extractors into a jsdom DOM) |
| `test/ui/fixture.js` | Fixed extraction result + tab info used to render the popup deterministically |
| `test/ui/load-popup.js` | Loads pure helpers (e.g. `formatWhen`) from `popup.js` for use in `render.js` |
| `test/ui/render.js` | Renders an approximation of the popup to PNG via satori + resvg (no browser) |
| `test/ui/fonts/` | Bundled Liberation Sans font files used by the renderer (OFL-licensed) |
| `test/ui/popup.test.js` | Compares the rendered popup against the stored snapshot |
| `test/ui/refresh-snapshot.js` | Regenerates `test/ui/snapshots/popup.png` and `popup-multi.png` |
| `test/ui/snapshots/popup.png`, `popup-multi.png` | Committed reference images of the popup (single / multiple events), browsable on GitHub |
| `test/ui/render-icon.js` | Renders the expected toolbar icon (green/red border) to PNG, no browser |
| `test/ui/icon.test.js` | Compares the rendered toolbar icon for each state against the stored snapshots and `icons/icon128-{green,red}.png` |
| `test/ui/refresh-icon-snapshot.js` | Regenerates `test/ui/snapshots/icon-{red,green}.png` |
| `test/ui/snapshots/icon-red.png`, `icon-green.png` | Committed reference images of the toolbar icon for unsupported/supported pages, browsable on GitHub |
| `tools/gen_icons.py` | Regenerates the PNG icons (Python stdlib only)           |
| `tools/shipping-files.js` | Single source of truth for the files that ship in the release zip |
| `tools/build-zip.js` | Builds `dist/google-calendar-event-creator.zip` (`npm run build`) from the shipping list |
| `test/unit/shipping-files.test.js` | Asserts the shipping list covers every runtime file and excludes dev/test files |

## Permissions

`activeTab` and `scripting`: the extension can read a page solely when you
click the button on it, and sends nothing anywhere — it just opens a Google
Calendar URL in a new tab.

`tabs`: lets `icon-state.js` see each tab's URL (hostname only) so it can
show the toolbar icon with a green border on pages with a site-specific
extractor (e.g. meetup.com) and a red border elsewhere.
