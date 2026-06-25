# High-level design

How the extension is built. What it shows and when — the product behavior — is
in [requirements.md §12–§16](../../requirements/requirements.md); the per-file map is in
[fileDescriptions.md](fileDescriptions.md); tunable product decisions live in
`extension/config.js`.

`toolbar-icon.js` colors the toolbar icon by host (a source matches or it doesn't). On
click, `popup.js` injects `event-extractors/` and runs `assemble-events.js`, which picks
the matching `custom/<site>.js` (or `extract-unsupported.js`);
`build-calendar-url.js` builds the URL `events-view.js` renders.

## Architecture rules of the road

Overarching rules for *how we build this* (whenever we agree on a new or changed
top-level architectural guideline, update this section as part of the same change):

- Adding support for a new host is the most common change — the architecture must
  keep it a single, self-contained new file
  (`extension/event-extractors/custom/<site>.js`) plus regenerating the load list,
  touching nothing else and assuming nothing about other extractors.

Portable agent-architecture principles that aren't specific to this project (the
unattended-agent judgment boundary, the bounded-and-enforced write surface) live
in the shared rules:
[claude/shared/agent-architecture.md](../claude/shared/agent-architecture.md). The
worked examples for both are this repo's auto-extractor pipeline
([auto-extractor.md](auto-extractor.md)).

## How extraction works

Everything — the popup and the tests alike — runs through one top-level
extractor, `GCal.extract()`, which selects the per-URL source internally and
returns `{ events, supported }`. Each event is self-described (title, location,
description, timezone, and its timing in `times[]` — one instance per showing,
each with its own start/end/duration), so a caller can build a Calendar URL for
any instance without consulting page-level state. Events that match on every
non-time field are folded into one multi-instance event by the assembler. It
picks a path by whether the page's host has a per-site source:

1. **Supported host** — a **self-contained site scraper** in `extension/event-extractors/custom/`.
   It produces every field of its events itself; no other extractor's output is
   merged over it. Each lives in its own file with a comment describing the HTML
   it expects; to support a new platform, add a file there following the same
   pattern and run `npm run index` to regenerate the load list
   (`extension/event-extractors/load-order.generated.json`). A source may reuse shared helpers —
   including the embedded-events reader for schema.org JSON-LD — to gather a
   field the page only states in embedded data (e.g. an end time).

2. **Unsupported host** — no per-site source, so the single **unsupported-site
   extractor** (`extension/event-extractors/extract-unsupported.js`) scrapes a best-effort event
   from the page's embedded JSON-LD and generic heuristics (microdata, Open Graph
   / meta tags, `<time datetime>`, `<h1>`/`<address>`, venue/location-named
   elements, and finally a date/time scan over the visible text).

The popup's `chooseContent` is the single decision behind what's rendered: it
keys off `supported`, the host's classification against `extension/config.js`'s
`sourceFallbackDenylist` / `sourceFallbackAllowlist` (via `extension/fallback-policy.js`),
and whether the fallback event is complete (title + location + start). The five
resulting states — and what the toolbar icon means alongside them — are specified
in [requirements.md §12–§16](../../requirements/requirements.md).

## Where decisions live

The pipeline is built from two kinds of file: extractors (the per-site sources
plus the one unsupported-site fallback) and shared helpers. An extractor doesn't
make output decisions — rendering, whitespace collapse, de-dup, sorting, and
timezone normalization all live in helpers, applied uniformly — except where it
must encode its own host's constraints (which elements to read, a fixed `ctz`, a
yearless date format). So the product rules in
[requirements.md §12–§16](../../requirements/requirements.md) — line-break-preserving
descriptions, chronological one-card-per-event, multi-instance grouping (an
event's showings carried in `times[]` and folded into one card), floating vs.
absolute times, the default duration and the card cap — are implemented once, in
helpers, `extension/event-extractors/assemble-events.js`, and `extension/config.js`, never per source.
The timezone rules in particular — floating local vs. exact instant vs. a
fixed-city `ctz` — are specified in
[requirements.md §15](../../requirements/requirements.md).
