# High-level design

> Top-level rules of the road live in
> [architectureGuidelines.md](architectureGuidelines.md); the per-file map is in
> [lowLevelDesign.md](lowLevelDesign.md).

## How extraction works

Everything runs through one top-level extractor, `GCal.extract()`, which picks a
path by whether the page's host has a per-site source:

1. **Supported host** — a **self-contained site scraper** in
   `pipeline/sources/`. It produces every field of its events itself; no other
   extractor's output is merged over it. Each lives in its own file with a
   comment describing the HTML it expects; to support a new platform, add a file
   there following the same pattern and run `npm run index` to regenerate the
   load list (`pipeline/load-order.generated.json`). A source may reuse shared
   helpers — including the embedded-events reader for schema.org JSON-LD — to
   gather a field the page only states in embedded data (e.g. an end time).

2. **Unsupported host** — no per-site source, so the single
   **unsupported-site extractor** (`pipeline/extract-unsupported.js`) scrapes a
   best-effort event from the page's embedded JSON-LD and generic heuristics
   (microdata, Open Graph / meta tags, `<time datetime>`, `<h1>`/`<address>`,
   venue/location-named elements, and finally a date/time scan over the visible
   text). Its result is used **only** to pre-fill the "request this source" form;
   it is never shown as a calendar button.

The extractor always returns a list of events (`{ events: [...] }`), each one
self-described (title, date/time, location, description, timezone). When a
page describes **several distinct events** — a film week or festival listing,
several JSON-LD events, etc. — every event is returned and the popup shows
**one button per event** so you can pick which one to add. An ordinary event
page yields a single event/button; a film that merely has several screening
dates stays one event. The events are ordered by start time, so they read
chronologically regardless of the order the page listed them in.

Text fidelity is decided once, in shared helpers, not per source: a
description preserves its line and paragraph breaks (`<br>`/newlines survive
into the Calendar details), while single-line fields like title and location
are whitespace-collapsed. No extractor flattens a description on its own.

Dates without a timezone offset are passed as floating local times, so the
event shows the same wall-clock time the page displayed. Dates with an
explicit offset (or trailing `Z`) are converted to an exact UTC instant before
being passed to Google Calendar, so the event occurs at the same moment in time
regardless of the viewer's own timezone. When no end time is found, a 2-hour
duration is assumed. A date without a time becomes an all-day event.

A site extractor that knows an event's location is fixed (e.g. a festival
that only ever runs in one city) can set `ctz` to that timezone (e.g. `"GB"`);
it's passed straight through as the
Calendar URL's `ctz` parameter. When `ctz` is set, an absolute start/end (one
carrying an offset or `Z`) is re-expressed as the floating local wall-clock
time in that timezone — so there's no need to keep it in UTC: the value reads
as the time the event's own city shows, and the `ctz` parameter places it
correctly regardless of the viewer's own timezone.
