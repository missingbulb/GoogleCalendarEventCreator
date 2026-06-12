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

Dates with an explicit timezone offset are passed to Google Calendar as exact
UTC instants; dates without one are passed as floating local times so the
event shows the same wall-clock time the page displayed. When no end time is
found, a 2-hour duration is assumed. A date without a time becomes an all-day
event.

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

## Files

| File            | Purpose                                                       |
| --------------- | ------------------------------------------------------------- |
| `manifest.json` | Manifest V3 definition (`activeTab` + `scripting` permissions) |
| `background.js` | Service worker: runs the extractor, builds and opens the URL  |
| `extractor.js`  | Injected into the page; all extraction logic lives here       |
| `tools/gen_icons.py` | Regenerates the PNG icons (Python stdlib only)           |

## Permissions

Only `activeTab` and `scripting`: the extension can read a page solely when
you click the button on it, and sends nothing anywhere — it just opens a
Google Calendar URL in a new tab.
