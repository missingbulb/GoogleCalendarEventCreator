# Google Calendar Event Creator

**[Install from the Chrome Web Store →](https://chromewebstore.google.com/detail/google-calendar-event-cre/illegojjeehdmfpgnhnehjjhlghapacc)**

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
are simply left for you to fill in on the Google Calendar screen. For how the
details are scraped from a page, see [dev/procedures/this_project/highLevelDesign.md](dev/procedures/this_project/highLevelDesign.md).

## Install (developer mode)

Grab the packaged extension — just the files that ship, not the whole repo:

1. Download
   [the latest release zip](https://github.com/missingbulb/GoogleCalendarEventCreator/releases/latest/download/google-calendar-event-creator.zip)
   (`google-calendar-event-creator.zip`, built by the
   [Release: Create Package workflow](dev/build/release/releasing.md#creating-a-release-package)) and extract
   it. It unpacks into a folder containing `manifest.json` — that folder is the
   one to load. As a secondary
   option, download
   [the repo as a zip](https://github.com/missingbulb/GoogleCalendarEventCreator/archive/refs/heads/main.zip)
   and extract it — here the deployable extension lives in the **`extension/`**
   subfolder (that's the one with `manifest.json` at its top), so load that
   subfolder, not the repo root.
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
**Load unpacked** the **`extension/`** subfolder of the working tree (that's the
extension root — everything else in the repo is tests, fixtures, and tooling) —
or run `npm run build` to produce the very same
`dist/google-calendar-event-creator.zip` the release serves.

## Use

Navigate to a page describing an event and click the extension's toolbar
button. A small popup opens with a button for each event found on the page,
showing its title, date/time, and location. Click the event you want to open
a new tab with the Google Calendar "create event" screen pre-filled; review
and save.

## Privacy

The extension collects, stores, and transmits **nothing** — all processing
happens locally in your browser and it makes no network requests of its own.
See [PRIVACY.md](PRIVACY.md) for the full policy.

## Permissions

`activeTab` and `scripting`: the extension can read a page solely when you
click the button on it, and sends nothing anywhere — it just opens a Google
Calendar URL in a new tab.

`declarativeContent`: lets `extension/icon/toolbar-icon.js` ask the **browser** to show a
green toolbar icon on pages with a site-specific extractor (e.g. meetup.com), a
gray icon on unsupported "news"-type sites, and the default blue icon elsewhere
— matched by host pattern inside Chrome. The extension never reads your tabs'
URLs, so it requests **no** "tabs"/browsing-history access.

## Documentation

- [Executable requirements](dev/requirements/README.md) — how requirements are modeled (a numbered breakdown where every leaf has a validating case) and how to add one.
- [Requirements](dev/requirements/requirements.md) — the numbered, executable requirements spec (popup UI, toolbar icon, extractor support, and product behavior), each leaf backed by a case.
- [High-level design](dev/procedures/this_project/highLevelDesign.md) — how extraction works, plus the top-level architecture rules of the road.
- [File descriptions](dev/procedures/this_project/fileDescriptions.md) — the per-file map.
- [Testing](dev/procedures/this_project/testing.md) — the test kinds (integration / unit / UI) and how to run and extend them.
- [Releasing](dev/build/release/releasing.md) — building the zip and publishing to the Chrome Web Store.
- Maintainer/agent guidance lives in [`CLAUDE.md`](CLAUDE.md) (which imports `dev/procedures/this_project/` and `dev/procedures/general/`).
