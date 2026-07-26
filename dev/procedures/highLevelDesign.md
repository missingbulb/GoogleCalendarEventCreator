# High-level design

How the extension is built. What it shows and when — the product behavior — is
in [requirements.md §12–§16](../requirements/requirements.md); the per-file map is in
[fileDescriptions.md](fileDescriptions.md); tunable product decisions live in
`extension/config.js`.

`toolbar-icon.js` colors the toolbar icon by host (from `fallback-lists.json`'s host lists). On
click, `popup.js` injects `event-extractors/` and runs `assemble-events.js`, which runs
`generic-extractor.js` and merges the matching `custom/<site>.js` over it;
`build-calendar-url.js` builds the URL `events-view.js` renders.

The top-level **architecture rules of the road** live in the gcec local pack's
[RULES.md](../../.claudinite/local/packs/gcec/RULES.md) (injected at session
start), not here — whenever we agree on a new or changed top-level architectural
guideline, update that section as part of the same change. Portable
agent-architecture principles (the unattended-agent judgment boundary, the
bounded-and-enforced write surface) are maintained outside this repo; the worked
example for both is this repo's auto-extractor pipeline
([task.md](../../.claudinite/local/packs/gcec/tasks/create-extractor/task.md)).

## How extraction works

Everything — the popup and the tests alike — runs through one top-level
extractor, `GCal.extract()`, which selects the per-URL source internally and
returns `{ events, fallback }`. Each event is self-described (title, location,
description, timezone, and its timing in `times[]` — one instance per showing,
each with its own start/end/duration), so a caller can build a Calendar URL for
any instance without consulting page-level state. Events that match on every
non-time field are folded into one multi-instance event by the assembler.

Extraction is **two layers, not two paths**:

1. **The core generic extractor** (`extension/generic-extractor.js`)
   runs on **every** page, whatever its host, and produces the base events from
   the page's own self-description: embedded schema.org JSON-LD plus generic
   heuristics (microdata, Open Graph / meta tags, `<time datetime>`,
   `<h1>`/`<address>`, venue/location-named elements, and finally a date/time
   scan over the visible text). Nothing in it may know about a specific site.
   It sits at the extension root, **outside** `event-extractors/`: that folder is
   the extensibility point for per-site extractors, and this is a fundamentally
   different thing — the one fixed reader they all layer over.

2. **A per-site source** (`extension/event-extractors/custom/<site>.js`) is a
   layer of **overrides** on top of that base. Its `extract()` returns only the
   fields it states better than the base, and they win field by field; anything
   it leaves out — very often the end time, sometimes the whole date — comes
   from the base. A source may instead return its own `events` array (a series
   page, a multi-night run), which replaces the base rather than overriding it.
   Each lives in its own file with a comment describing the HTML it expects.

**Being supported is declared, not derived.** `supportedDomains` in
`extension/fallback-lists.json` is the one list of hosts we claim; both the
toolbar service worker (icon color) and the popup (which render state) read it
directly, so they cannot disagree. It is NOT a mirror of the extractors: a site
whose pages describe themselves completely is fully supported with **no source
file at all** — same green icon, same popup, no "Suggest Correction" prompt —
because no per-site source claimed the page and so nothing was missed. The one
invariant a drift test guards is the other direction: every per-site source's
host must appear in that list.

So adding support for a platform is: list the host, then check whether the
generic extractor already reads its pages right. If it does, you're done. If it
doesn't, add a `custom/<site>.js` for what it gets wrong and run `npm run index`
to regenerate the load list
(`extension/event-extractors/load-order.generated.json`). A source that shrinks to
nothing is simply deleted — its host stays listed, and stays supported.

An **unsupported** host (not on the list) gets the same base events; the popup
then decides whether they're complete enough to show and whether to invite a
source request.

The popup's `chooseContent` is the single decision behind what's rendered: it
keys off `supported`, the host's classification against `extension/config.js`'s
`sourceFallbackDenylist` / `sourceFallbackAllowlist` (via `extension/fallback-policy.js`),
and whether the fallback event is complete (title + location + start). The five
resulting states — and what the toolbar icon means alongside them — are specified
in [requirements.md §12–§16](../requirements/requirements.md).

## Where decisions live

The pipeline is built from two kinds of file: extractors (the one core generic
extractor plus the per-site sources) and shared helpers. An extractor doesn't
make output decisions — rendering, whitespace collapse, de-dup, sorting, and
timezone normalization all live in helpers, applied uniformly — except where it
must encode its own host's constraints (which elements to read, a fixed `ctz`, a
yearless date format). So the product rules in
[requirements.md §12–§16](../requirements/requirements.md) — line-break-preserving
descriptions, chronological one-card-per-event, multi-instance grouping (an
event's showings carried in `times[]` and folded into one card), floating vs.
absolute times, the default duration and the card cap — are implemented once, in
helpers, `extension/event-extractors/assemble-events.js`, and `extension/config.js`, never per source.
The timezone rules in particular — floating local vs. exact instant vs. a
fixed-city `ctz` — are specified in
[requirements.md §15](../requirements/requirements.md).
