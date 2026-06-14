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
are simply left for you to fill in on the Google Calendar screen. For how the
details are scraped from a page, see [docs/architecture.md](docs/architecture.md).

## Install (developer mode)

Grab the packaged extension — just the files that ship, not the whole repo:

1. Download
   [the latest release zip](https://github.com/missingbulb/GoogleCalendarEventCreator/releases/latest/download/google-calendar-event-creator.zip)
   (`google-calendar-event-creator.zip`, built by the
   [Create Release Package workflow](docs/releasing.md#creating-a-release-package)) and extract
   it. It unpacks into a folder containing `manifest.json`. As a secondary
   option, download
   [the repo as a zip](https://github.com/missingbulb/GoogleCalendarEventCreator/archive/refs/heads/main.zip)
   and extract it — the `manifest.json` for **Load unpacked** lives at the top
   of the extracted folder.
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

## Privacy

The extension collects, stores, and transmits **nothing** — all processing
happens locally in your browser and it makes no network requests of its own.
See [PRIVACY.md](PRIVACY.md) for the full policy.

## Permissions

`activeTab` and `scripting`: the extension can read a page solely when you
click the button on it, and sends nothing anywhere — it just opens a Google
Calendar URL in a new tab.

`tabs`: lets `ui/toolbar-icon.js` see each tab's URL (hostname only) so it can
show the toolbar icon with a green border on pages with a site-specific
extractor (e.g. meetup.com) and a red border elsewhere.

## Documentation

- [Architecture](docs/architecture.md) — how extraction works and the file map.
- [Testing](docs/testing.md) — the test kinds (integration / unit / UI) and how to run and extend them.
- [Releasing](docs/releasing.md) — building the zip and publishing to the Chrome Web Store.
- [Resources](docs/resources.md) — external references relevant to the project.
- [Security review](docs/security-review.md) — attack surface, trust boundaries, and known risks.
- Maintainer/agent guidance lives in [`CLAUDE.md`](CLAUDE.md) (which imports `docs/claude/`).
