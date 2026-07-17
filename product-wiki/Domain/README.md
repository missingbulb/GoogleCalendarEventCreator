# Domain

A self-growing wiki of the **problem domain** this extension models: how events
are represented on the web, and how those representations shape what the
extension can extract. Where [`../Market/`](../Market/README.md),
[`../Users/`](../Users/README.md), and
[`../Competitors/`](../Competitors/README.md) cover the outside actors (the
platforms, the people, the rivals), this wiki covers the *thing itself* — the
event data, formats, and page shapes the extractor has to make sense of. It is
the knowledge that most directly drives extraction requirements.

## Machine-readable event formats (as of 2026-07-16)

Ordered roughly by how useful they are to a rule-based extractor — highest-signal
first. The project's stance (see `dev/procedures/technicalGotchas.md`) is to
**prefer machine-readable markup over brittle DOM scraping**, because it survives
redesigns and single-page-app rendering.

- **schema.org `Event` as JSON-LD** — the highest-value target and the one Google
  actively rewards. Emitted as a standalone `<script type="application/ld+json">`
  block, so it is cleanly separable from the page markup and survives client-side
  rendering. Google's required properties are **`name`, `startDate`, and
  `location`**; `startDate`/`endDate` are ISO-8601 **with a UTC/GMT offset**
  (the offset is what lets us derive `ctz` safely — see `helpers/derive-timezone.js`).
  `location` is a `Place` (with `address`: `streetAddress`, `addressLocality`,
  `addressRegion`, `postalCode`) or a `VirtualLocation` (URL only) for online
  events. Since 2020 Google also expects **`eventAttendanceMode`**
  (`Offline`/`Online`/`Mixed`), and as of a June 2025 change requires a **physical
  location** for the rich result at all. Recommended extras that often carry real
  data: `endDate`, `eventStatus`, `image`, `description`, `offers`.
- **Microdata / RDFa** (schema.org vocabulary inline in the HTML) — same
  vocabulary, embedded in the markup rather than a separate block. Common on
  server-rendered sites; JSON-LD is now preferred and gets new features first, so
  microdata/RDFa are a declining but still-present fallback worth reading when no
  JSON-LD block exists.
- **`h-event` / hCalendar microformats** — an older, class-attribute convention
  (`h-event`, `p-name`, `dt-start`, `p-location`). Google added hCalendar event
  support back in 2010; adoption has been overtaken by schema.org, but legacy and
  indie-web event pages still use it. Note: microformats are **not** part of the
  schema.org vocabulary, so a separate reader is needed.
- **OpenGraph / meta tags** (`og:title`, `og:description`, and event-ish `<meta>`)
  — not event-specific, but SPA pages very often still inject them, so they are a
  reliable low-fidelity fallback for title/description when nothing structured
  exists.
- **iCalendar (`.ics` / RFC 5545)** — the interchange format calendars import,
  not usually embedded in a page, but the semantic reference for event modelling.
  A `VEVENT` carries `DTSTART`/`DTEND` with a **`TZID`** (or a trailing `Z` for
  UTC, or a bare **floating** time that means "the same wall-clock time in every
  zone"). Recurrence is an **`RRULE`** (`FREQ` = DAILY/WEEKLY/MONTHLY/YEARLY plus
  `INTERVAL`/`COUNT`/`UNTIL`/`BYDAY`…) expanded from `DTSTART`, with `RDATE`/`EXDATE`
  adjustments. This is the vocabulary to match when we reason about timezones and
  repeats even though we target Google Calendar's `render` URL, not `.ics`.

## Page-shape taxonomy

The extractor must first recognise *what kind of event page* it's on — this is the
structural decision behind "one button per event":

- **Single-event page** — one clear event (a concert, a talk, a venue listing).
  Usually one `Event` JSON-LD block or one hero heading + date/venue. The common
  case.
- **Listing / index page** — a calendar-of-events or search-results page with many
  entries, often an array of `Event` objects or repeated cards. Drives the
  multiple-buttons behaviour; the generic fallback can't reliably enumerate these
  (it recovers the primary event only — see the fallback-coverage gate).
- **Series / recurring page** — one event described as repeating (an `RRULE` in
  `.ics`, or schema.org `eventSchedule`). A single page can imply many instances;
  how many to surface is genuinely undecided (see Open questions).

## Timezone & recurrence semantics

- **Timezone** is the trust-critical field: a wrong `ctz` is worse than none
  (`derive-timezone.js`'s unanimity rule). The domain gives three shapes — an
  **offset-bearing** instant (ISO-8601 `…+02:00`, or `.ics` `Z`/`TZID`), a
  **floating** time (no zone; "same wall-clock everywhere"), and **no time signal
  at all**. Only the first lets `ctz` be *derived* rather than guessed.
- **Recurrence** (`RRULE`, `eventSchedule`) is currently out of the extension's
  scope — it surfaces the event, not its repeat rule. Whether a recurring page
  should yield one instance, the next instance, or a note is an open product
  question, not a settled requirement.

## Implications for extraction requirements

- The format ranking above is *why* the extractor is structured as dedicated
  per-site sources + a generic JSON-LD/`og`-first fallback: the machine-readable
  layers are the durable signal, the DOM is the last resort.
- "An event needs real data, not just a supported host" (technicalGotchas) is a
  direct consequence of the taxonomy: a host match is not an `Event` object.
- The timezone shapes above are the domain justification for the refusal-to-guess
  `ctz` contract — a product-requirements-level stance, distilled in
  [`../product-requirements/`](../product-requirements/README.md).

## Open questions

- What share of real-world event pages carry `schema.org/Event` JSON-LD vs.
  needing microdata/microformat/DOM fallback? A rough measured split would sharpen
  the generic fallback's priorities (cross-ref the fallback-coverage routine).
- Recurring/series pages: what's the right product behaviour — one instance, the
  next upcoming, or an explicit "this repeats" affordance?
- Are `h-event` microformats still worth a dedicated reader in 2026, or has
  schema.org adoption made them negligible? (Needs a real prevalence check.)
- Does any meaningful share of target sites express events only via `.ics`
  download links (no in-page structured data) worth following?

## Sources

- [Event — Schema.org Type](https://schema.org/Event)
- [Learn About Google Event Schema Markup — Google Search Central](https://developers.google.com/search/docs/appearance/structured-data/event)
- [eventAttendanceMode — Schema.org Property](https://schema.org/eventAttendanceMode)
- [Microdata vs JSON-LD vs RDFa: Which Structured Data Format to Use in 2026](https://rishikc.com/articles/structured-data-formats-compared-microdata-jsonld-rdfa-2026/)
- [microformats.org — microdata](http://microformats.org/wiki/microdata)
- [RFC 5545 — Internet Calendaring and Scheduling Core Object Specification (iCalendar)](https://datatracker.ietf.org/doc/html/rfc5545)
- [Handling Dates and Times — CalConnect iCalendar dev guide](https://devguide.calconnect.org/iCalendar-Topics/Handling-Dates-and-Times/)

## Growth log

- **2026-07-16** — initial seed (folder scaffolding + first research pass on web
  event-representation formats, page-shape taxonomy, and timezone/recurrence
  semantics).
