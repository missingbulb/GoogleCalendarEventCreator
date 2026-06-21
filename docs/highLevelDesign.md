# High-level design

How the extension is built. What it shows and when — the product behavior — is
in [Requirements.md §12–§16](../executable-requirements/Requirements.md); the per-file map is in
[fileDescriptions.md](fileDescriptions.md); top-level rules of the road are in
[architectureGuidelines.md](architectureGuidelines.md).

`toolbar-icon.js` colors the toolbar icon by host (a source matches or it doesn't). On
click, `popup.js` injects `pipeline/` and runs `assemble-events.js`, which picks
the matching `sources/<site>.js` (or `extract-unsupported.js`);
`build-calendar-url.js` builds the URL `events-view.js` renders.

## How extraction works

Everything — the popup and the tests alike — runs through one top-level
extractor, `GCal.extract()`, which selects the per-URL source internally and
returns `{ events, supported }`. Each event is self-described (title, location,
description, timezone, and its timing in `times[]` — one instance per showing,
each with its own start/end/duration), so a caller can build a Calendar URL for
any instance without consulting page-level state. Events that match on every
non-time field are folded into one multi-instance event by the assembler. It
picks a path by whether the page's host has a per-site source:

1. **Supported host** — a **self-contained site scraper** in `extension/pipeline/sources/`.
   It produces every field of its events itself; no other extractor's output is
   merged over it. Each lives in its own file with a comment describing the HTML
   it expects; to support a new platform, add a file there following the same
   pattern and run `npm run index` to regenerate the load list
   (`extension/pipeline/load-order.generated.json`). A source may reuse shared helpers —
   including the embedded-events reader for schema.org JSON-LD — to gather a
   field the page only states in embedded data (e.g. an end time).

2. **Unsupported host** — no per-site source, so the single **unsupported-site
   extractor** (`extension/pipeline/extract-unsupported.js`) scrapes a best-effort event
   from the page's embedded JSON-LD and generic heuristics (microdata, Open Graph
   / meta tags, `<time datetime>`, `<h1>`/`<address>`, venue/location-named
   elements, and finally a date/time scan over the visible text).

The popup's `chooseContent` is the single decision behind what's rendered: it
keys off `supported`, the host's classification against `extension/config.js`'s
`sourceFallbackDenylist` / `sourceFallbackAllowlist` (via `extension/fallback-policy.js`),
and whether the fallback event is complete (title + location + start). The five
resulting states — and what the toolbar icon means alongside them — are specified
in [Requirements.md §12–§16](../executable-requirements/Requirements.md).

## Where decisions live

The pipeline is built from two kinds of file: extractors (the per-site sources
plus the one unsupported-site fallback) and shared helpers. An extractor doesn't
make output decisions — rendering, whitespace collapse, de-dup, sorting, and
timezone normalization all live in helpers, applied uniformly — except where it
must encode its own host's constraints (which elements to read, a fixed `ctz`, a
yearless date format). So the product rules in
[Requirements.md §12–§16](../executable-requirements/Requirements.md) — line-break-preserving
descriptions, chronological one-card-per-event, multi-instance grouping (an
event's showings carried in `times[]` and folded into one card), floating vs.
absolute times, the default duration and the card cap — are implemented once, in
helpers, `extension/pipeline/assemble-events.js`, and `extension/config.js`, never per source.

## Timezone handling

A source emits a date in one of three shapes: a floating local time (no offset),
an exact instant (an offset or trailing `Z`), or a date with no time. The shared
helpers pass a floating time straight through and convert an instant to UTC. A
source that knows an event's location is fixed (e.g. a festival that only runs in
one city) sets `ctz` to that timezone (e.g. `"GB"`), which is passed straight
through as the Calendar URL's `ctz` parameter; when `ctz` is set, an absolute
start/end is re-expressed as the floating local wall-clock time in that zone, so
the value reads as the event's own city shows it and `ctz` places it correctly
for any viewer.
