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

## Install

**[Install from the Chrome Web Store →](https://chromewebstore.google.com/detail/google-calendar-event-cre/illegojjeehdmfpgnhnehjjhlghapacc)**

Or load the latest development build:

1. Download [the latest release zip](https://github.com/missingbulb/GoogleCalendarEventCreator/releases/latest/download/google-calendar-event-creator.zip)
   and extract it — it unpacks to a folder with `manifest.json` at its top.
2. Open `chrome://extensions`, enable **Developer mode** (top right), click
   **Load unpacked**, and select that folder.

To pick up a later release, download the new zip, extract it over the same
folder, and click the refresh icon on the extension's card in
`chrome://extensions`. If you're **working on the extension**, clone the repo
instead and **Load unpacked** the **`extension/`** subfolder of the working tree
(that's the extension root — everything else in the repo is tests, fixtures, and
tooling) — or run `npm run build` to produce the very same
`dist/google-calendar-event-creator.zip` the release serves.

## Releasing

The version users see is [`extension/manifest.json`](extension/manifest.json)'s
`version`. Merging a version bump to `main` cuts GitHub Release `vX.Y.Z` with
`google-calendar-event-creator.zip` attached, and the daily auto-release ships
shipped-file changes to the Chrome Web Store on its own (patch-bumping as
needed).

## Use

Navigate to a page describing an event and click the extension's toolbar
button. A small popup opens with a button for each event found on the page,
showing its title, date/time, and location. Click the event you want to open
a new tab with the Google Calendar "create event" screen pre-filled; review
and save.

## Privacy

The extension collects, stores, and transmits **nothing** — all processing
happens locally in your browser and it makes no network requests of its own.
See [the privacy policy](dev/build/release/store_artifacts/PRIVACY.md) for the full
policy (also published at
<https://missingbulb.github.io/GoogleCalendarEventCreator/privacy/>).

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
- Maintainer/agent guidance lives in [`CLAUDE.md`](CLAUDE.md) (which imports `dev/procedures/this_project/`).
