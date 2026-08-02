# Domain

A self-growing wiki of the **problem domain** this extension models: how events
are represented on the web, and how those representations shape what the
extension can extract. Where [`../Market/`](../Market/README.md),
[`../Users/`](../Users/README.md), and
[`../Competitors/`](../Competitors/README.md) cover the outside actors (the
platforms, the people, the rivals), this wiki covers the *thing itself* — the
event data, formats, and page shapes the extractor has to make sense of. It is
the knowledge that most directly drives extraction requirements.

## Key insights

- Not one of the 36 recorded event pages emits schema.org `eventSchedule`, so the recurrence mapping cost is moot.
- `schema.org/Event` sits on under 1M domains, so most event pages carry no Event block at all.
- Of this project's own 24 recorded target hosts, 14 carry Event JSON-LD; the other 10 need DOM, `og:` or text.
- Microformats together are under 1% of pages, so `h-event` never justifies its own parser.
- Google Calendar's render URL already accepts `recur=RRULE:…` — repeats were never blocked by the link we emit.
- A wrong timezone is worse than none, so a zone ships only when two independent page hints agree.
- No recorded target page offers a `.ics` download in place of markup; that page shape does not appear.

## Machine-readable event formats (as of 2026-07-16)

Ordered roughly by how useful they are to a rule-based extractor — highest-signal
first. The project's stance (see the **architecture rules of the road** section of
`.claudinite/local/packs/gcec/RULES.md`, where it reads "prefer extracting
JSON-LD/`og:` (which apps still inject) over brittle DOM positions" — the
`dev/procedures/technicalGotchas.md` this page previously cited was superseded
when that doc was folded into the gcec pack) is to **prefer machine-readable
markup over brittle DOM scraping**, because it survives redesigns and
single-page-app rendering.

- **schema.org `Event` as JSON-LD** — the highest-value target and the one Google
  actively rewards. Emitted as a standalone `<script type="application/ld+json">`
  block, so it is cleanly separable from the page markup and survives client-side
  rendering. Google's required properties are **`name`, `startDate`, and
  `location`**; `startDate`/`endDate` are ISO-8601 **with a UTC/GMT offset**
  (the offset is what lets us derive `ctz` safely — see
  `extension/event-extractors/helpers/derive-timezone.js`).
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
  JSON-LD block exists. Web-wide, Microdata is still material — the *Web Almanac
  2024* has it steady on roughly a quarter of pages (~26%), well ahead of
  microformats below.
- **`h-event` / hCalendar microformats** — an older, class-attribute convention
  (`h-event`, `p-name`, `dt-start`, `p-location`). Google added hCalendar event
  support back in 2010; adoption has been overtaken by schema.org, but legacy and
  indie-web event pages still use it. **A 2026 prevalence check settles whether
  they're worth a dedicated reader — no:** the HTTP Archive *Web Almanac 2024*
  puts *all* microformats combined below ~1% of pages (hCalendar only a fraction
  of that), against JSON-LD at ~41% (up from 34% in 2022) and Microdata steady at
  ~26%. So `h-event`/hCalendar is a negligible tail; where it does appear, the
  generic text/`og:` fallback is enough. Note: microformats are **not** part of
  the schema.org vocabulary, so any dedicated reader would need its own parser —
  another reason not to build one for a sub-1% format. **Tooling corroboration
  (2026-07-26):** the one browser tool that ever shipped a microformat→calendar
  reader at scale — the Google-encouraged "Google Calendar" Chrome extension,
  which detected `hCalendar` and derivative microformats on the page and offered
  a one-click add — is formally shut down and no longer installable, and the
  generic "Microformats" extension that exported `hCalendar` to iCalendar is
  likewise reported delisted (unmaintained since ~2014). So there is also no
  live microformat event reader left to borrow from (the demand-side reading of
  the same fact is in [`../Competitors/`](../Competitors/README.md)).
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

- **Timezone** is the trust-critical field: a wrong `ctz` is worse than none —
  the unanimity rule, stated in the contract header of
  `extension/event-extractors/helpers/derive-timezone.js` itself (not in the gcec
  pack's RULES.md): a zone is returned **only when two independent page-declared
  hints agree**, and `""` whenever anything disagrees. The four hint kinds that
  file recognises are *stated* (an IANA zone in inline-script JSON), *offset* (the
  event's own UTC offset — a trailing `Z` explicitly does **not** count, since
  pages habitually serialize in UTC regardless of venue), *country*, and *locale*.
  The domain gives three shapes — an
  **offset-bearing** instant (ISO-8601 `…+02:00`, or `.ics` `Z`/`TZID`), a
  **floating** time (no zone; "same wall-clock everywhere"), and **no time signal
  at all**. Only the first lets `ctz` be *derived* rather than guessed.
- **Recurrence** (`RRULE`, `eventSchedule`) is currently out of the extension's
  scope — it surfaces the event, not its repeat rule. Whether a recurring page
  should yield one instance, the next instance, or a note is an open product
  question, not a settled requirement. Two 2026 findings narrow *where* the cost
  of ever changing that sits:
  - **The sink is not the blocker.** Google Calendar's
    `render?action=TEMPLATE` link — the exact URL this extension emits — takes an
    optional **`recur`** parameter whose value is an RFC-5545 recurrence rule
    verbatim: `recur=RRULE:FREQ=DAILY` (`required: no`, `format: text
    (RFC-5545 specs)`), and in practice fuller rules such as
    `recur=RRULE:FREQ=MONTHLY;INTERVAL=1;BYDAY=2MO;UNTIL=20250609T000000Z`. So
    "hand the user a repeating event" is already expressible in the target we
    emit; nothing about the render URL forces the one-instance behaviour.
  - **The source side speaks a different vocabulary.** schema.org does *not*
    express repeats as an `RRULE` string. A repeating event carries
    **`eventSchedule`** → a **`Schedule`**, whose minimum is **`repeatFrequency`
    as an ISO-8601 *duration*** (`P1W`, `P1M`, `P1D` — not `FREQ=WEEKLY`),
    alongside `byDay` / `byMonth` / `byMonthDay` (e.g. `byDay` as an array of
    `https://schema.org/Monday`-style URLs), `scheduleTimezone` (an IANA zone),
    `startDate`/`endDate`, `startTime`/`endTime`, and `exceptDate` for
    exclusions. Emitting `recur=` from page markup therefore needs a genuine
    translation step (`repeatFrequency: P1W` + `byDay` → `FREQ=WEEKLY;BYDAY=…`,
    `exceptDate` → `EXDATE`), not a pass-through. **That mapping — plus whether
    target sites emit `eventSchedule` at all — is the real cost, not the URL.**
  - **And the source signal is absent (measured 2026-08-02): the mapping cost is
    moot.** A census of every recorded page in this repo's own extractor corpus
    ([`dev/requirements/extractor/data/server-fetched/`](https://github.com/missingbulb/GoogleCalendarEventCreator/tree/main/dev/requirements/extractor/data/server-fetched))
    — 36 pages across 24 distinct hosts — finds **zero** occurrences of the
    `eventSchedule` property, of `"@type": "Schedule"`, of `repeatFrequency`, and
    of any `RRULE` string. (The 15 pages that match a naive `eventSchedule` grep
    are all false positives: they carry the *`eventStatus`* enum value
    `schema.org/EventScheduled`, an unrelated token.) This is not a rendering
    artifact — the pipeline fetches with ScraperAPI `render=true`, so the page's
    JS has executed before the snapshot is taken (see
    [`scraperapi.mjs`](https://github.com/missingbulb/GoogleCalendarEventCreator/blob/main/.claudinite/local/packs/gcec/tasks/create-extractor/scraperapi.mjs)).
    So schema.org recurrence is effectively unused across the sites this
    extension actually targets, and a `Schedule`→`RRULE` translator would have
    nothing to translate. Sampling caveat: hosts enter this corpus because
    someone asked for an extractor, which skews toward ticketing/venue *single
    instance* pages; a genuinely series-shaped host could still emit it.

## Implications for extraction requirements

- The format ranking above is *why* the extractor is structured as dedicated
  per-site sources + a generic JSON-LD/`og`-first fallback: the machine-readable
  layers are the durable signal, the DOM is the last resort.
- "An event needs real data, not just a supported host" (gcec pack RULES.md,
  *Codebase gotchas*) is a direct consequence of the taxonomy: a host match is
  not an `Event` object.
- The timezone shapes above are the domain justification for the refusal-to-guess
  `ctz` contract — a product-requirements-level stance, distilled in
  [`../product-requirements/`](../product-requirements/README.md).
- **`Event` JSON-LD is real but a minority signal.** The Google/schema.org usage
  statistics (June 2026 dataset) put `schema.org/Event` on **fewer than ~1 million
  domains** — an order of magnitude behind common types like `author` (10M+);
  Web Data Commons corroborates from the Common Crawl corpus. So a large share of
  event pages carry *no* `Event` block, which is exactly why the DOM/text and
  `og:`/microdata fallback path (and the fallback-coverage routine) carries real
  weight rather than being a rare edge case.
- **No dedicated microformats reader is warranted.** The 2026 prevalence check
  (see the `h-event` bullet) puts *all* microformats combined under ~1% of pages,
  so `h-event`/hCalendar stays a fallback-only concern — extraction effort belongs
  on the JSON-LD → Microdata → `og:`/text ladder, not a bespoke hCalendar parser.
- **On this project's own target hosts the JSON-LD/fallback split is roughly
  60/40 (measured 2026-08-02).** The same corpus census gives the per-target-host
  number the web-wide figures could not. Of the **24 distinct hosts** with a
  recorded page, **14 carry an `Event`-family JSON-LD `@type`** (bandsintown,
  dash.datadoghq.com, dice.fm, eventbrite, eventer.co.il, eventim.co.il,
  livenation, luma.com, meetup, seetickets, somo.social, stubhub,
  tel-aviv.gov.il, visit.tel-aviv.gov.il). The remaining **10 split in two**:
  **5 emit JSON-LD but never an `Event`** (cinema.co.il, comy.co.il, seatgeek,
  tabitisrael.co.il, thinkdrink.co.il — typically `Organization`/`WebSite`
  boilerplate, which is worse than no JSON-LD because it looks like a hit), and
  **5 emit no JSON-LD at all** (barby.co.il, edfringe.com, events.datadoghq.com,
  secrettelaviv.com, ticketmaster.co.il). So the DOM/`og:`/text ladder is the
  *only* path on ~40% of the hosts this extension supports — the fallback is a
  primary code path, not an edge case. Same sampling caveat as above: a host
  earns a recorded page by being asked for, and the generic path failing is often
  why it was asked for, so this over-samples hard pages relative to the open web.
- **`.ics`-only event pages did not appear.** No page in the corpus links a
  `.ics` file or serves `text/calendar` in place of in-page markup, so
  "follow the download link" is not a fallback worth building on current evidence.

## Open questions

- ~~A precise `Event`-JSON-LD-vs-fallback split per *target host*.~~ **Answered
  2026-08-02** by censusing the recorded extractor corpus: 14 of 24 hosts carry
  `Event` JSON-LD, 5 carry JSON-LD without an `Event`, 5 carry none — see the
  ~60/40 bullet under Implications. What remains open is narrower: **does the
  "JSON-LD but no `Event`" shape (5 of 24 hosts) mislead the generic extractor
  into a false positive?** A page with `Organization` JSON-LD and no `Event` is
  structurally a fallback case wearing a structured-data costume; the
  generic-coverage suite is where that would show.
- Recurring/series pages: what's the right product behaviour — one instance, the
  next upcoming, or an explicit "this repeats" affordance? (Narrowed 2026-07-26:
  the *transport* question is settled — the render URL's `recur=RRULE:…` carries a
  repeat rule fine — so this is now purely a product-behaviour choice plus the
  `Schedule`→`RRULE` mapping cost, both described above.)
- ~~Do any of this extension's target sites actually emit `eventSchedule` /
  `Schedule` markup, or is schema.org recurrence effectively unused in the wild?~~
  **Answered 2026-08-02: none do** — zero occurrences across 36 recorded pages /
  24 hosts (see the recurrence section). The mapping cost identified on 2026-07-26
  is therefore not worth paying against today's target set. Worth a re-check only
  if a genuinely series-shaped host (a repertory cinema, a weekly class) is added.
- ~~Does any meaningful share of target sites express events only via `.ics`
  download links (no in-page structured data) worth following?~~ **Answered
  2026-08-02: no** — no `.ics` link or `text/calendar` reference in the corpus at all.
- **Does JSON-LD-without-an-`Event` cause false positives?** 5 of 24 hosts serve
  JSON-LD carrying no `Event` object. Whether the generic extractor treats that as
  a structured hit and degrades, or correctly falls through to text, is unmeasured.
  Surfaced 2026-08-02.

## Sources

- [Event — Schema.org Type](https://schema.org/Event)
- [Learn About Google Event Schema Markup — Google Search Central](https://developers.google.com/search/docs/appearance/structured-data/event)
- [eventAttendanceMode — Schema.org Property](https://schema.org/eventAttendanceMode)
- [Microdata vs JSON-LD vs RDFa: Which Structured Data Format to Use in 2026](https://rishikc.com/articles/structured-data-formats-compared-microdata-jsonld-rdfa-2026/)
- [microformats.org — microdata](http://microformats.org/wiki/microdata)
- [RFC 5545 — Internet Calendaring and Scheduling Core Object Specification (iCalendar)](https://datatracker.ietf.org/doc/html/rfc5545)
- [Handling Dates and Times — CalConnect iCalendar dev guide](https://devguide.calconnect.org/iCalendar-Topics/Handling-Dates-and-Times/)
- [Announcing the Schema.org usage statistics dataset (blog.schema.org, 2026)](https://blog.schema.org/2026/06/04/announcing-the-schema-org-usage-statistics-dataset/)
- [Structured data — 2024 Web Almanac (HTTP Archive)](https://almanac.httparchive.org/en/2024/structured-data)
- [Web Data Commons — schema.org data sets](https://webdatacommons.org/structureddata/schemaorg/)
- [chimbori/google-calendar-crx — the shut-down "Google Calendar" Chrome extension (archived)](https://github.com/chimbori/google-calendar-crx)
- [thanhpd/google-calendar-crx — fork documenting its hCalendar/hResume microformat event detection](https://github.com/thanhpd/google-calendar-crx)
- [Microformats — Chrome extension listing (chrome-stats)](https://chrome-stats.com/d/oalbifknmclbnmjlljdemhjjlkmppjjl)
- [Google Calendar link parameters (`recur`, `ctz`, `dates`) — add-event-to-calendar-docs](https://github.com/InteractionDesignFoundation/add-event-to-calendar-docs/blob/master/services/google.md)
- [RFC 5545 §3.8.5.3 — Recurrence Rule (`RRULE`)](https://icalendar.org/iCalendar-RFC-5545/3-8-5-3-recurrence-rule.html)
- [How to Create "Add to Calendar" Links (TeamDynamix KB) — `&recur=RRULE:` example](https://teamdynamix.umich.edu/TDClient/210/DepressionCenter/KB/ArticleDet?ID=13454)
- [eventSchedule — Schema.org Property](https://schema.org/eventSchedule)
- [Schedule — Schema.org Type](https://schema.org/Schedule)
- [Additional `Schedule` type examples — schemaorg/schemaorg Discussion #2948](https://github.com/schemaorg/schemaorg/discussions/2948)
- [`dev/requirements/extractor/data/server-fetched/` — this repo's recorded extractor corpus](https://github.com/missingbulb/GoogleCalendarEventCreator/tree/main/dev/requirements/extractor/data/server-fetched) — the 36 pages / 24 hosts censused on 2026-08-02 for `eventSchedule`, `Event` JSON-LD and `.ics` links
- [`scraperapi.mjs` — the recording pipeline's `render=true` fetch](https://github.com/missingbulb/GoogleCalendarEventCreator/blob/main/.claudinite/local/packs/gcec/tasks/create-extractor/scraperapi.mjs) — why a missing property in the corpus is a real absence, not an unrendered SPA

## Growth log

- **2026-07-16** — initial seed (folder scaffolding + first research pass on web
  event-representation formats, page-shape taxonomy, and timezone/recurrence
  semantics).
- **2026-07-17** — answered the JSON-LD-prevalence open question directionally:
  the Google/schema.org usage stats put `Event` on fewer than ~1M domains (far
  behind common types), so `Event` markup is a minority and the DOM/fallback path
  carries a large share — added to Implications; narrowed the open question to a
  per-target-host measured split via the fallback-coverage corpus.
- **2026-07-19** — answered the `h-event`/microformats open question with a real
  prevalence check: the HTTP Archive *Web Almanac 2024* puts all microformats
  combined below ~1% of pages (vs JSON-LD ~41% / Microdata ~26%), so
  hCalendar/`h-event` is a negligible tail not worth a dedicated reader — folded
  into the microformats format bullet and Implications; removed that open
  question.
- **2026-07-26** — worked the recurrence open question and split it in two: the
  render URL we already emit accepts `recur=RRULE:…` (RFC-5545, verbatim), so the
  sink was never the constraint; schema.org instead models repeats as
  `eventSchedule`→`Schedule` with `repeatFrequency` as an ISO-8601 *duration*
  (`P1W`) plus `byDay`/`scheduleTimezone`/`exceptDate`, so a real
  `Schedule`→`RRULE` translation is where the cost sits. Narrowed the recurrence
  question to a pure product-behaviour choice and surfaced a new one (do target
  sites emit `eventSchedule` at all). Also corrected two stale repo references
  this page carried: `dev/procedures/technicalGotchas.md` no longer exists — its
  content moved into the gcec pack's `RULES.md` *Codebase gotchas* section — and
  `derive-timezone.js` lives at `extension/event-extractors/helpers/`.
- **2026-07-26 (same pass, second half)** — verified the replacement citations
  written earlier the same day and corrected two of them: the JSON-LD-over-DOM
  stance lives in RULES.md's **architecture rules of the road**, not *Codebase
  gotchas* (only the "supported host ≠ an event" rule is in *Codebase gotchas*),
  and the `ctz` unanimity rule is **not in RULES.md at all** — its home is the
  contract header of `extension/event-extractors/helpers/derive-timezone.js`.
  Quoted that contract's actual terms (two independent hints must agree; a
  trailing `Z` is not a hint) so the claim is checkable rather than a pointer to
  the wrong section.
- **2026-07-26 (third pass)** — added tooling corroboration to the microformats
  bullet: both browser tools that ever read `hCalendar` into a calendar (the
  archived "Google Calendar" Chrome extension and the delisted "Microformats"
  extension) are gone from the Chrome Web Store, so the
  no-dedicated-microformats-reader conclusion now rests on abandoned tooling as
  well as sub-1% prevalence. The demand-side reading lives in Competitors. No
  open question answered or opened here.
- **2026-08-02** — answered three open questions from one measurement: a census of
  this repo's own recorded extractor corpus (36 pages, 24 hosts, fetched with
  ScraperAPI `render=true` so the JS has run). (1) schema.org **recurrence is
  absent** — zero `eventSchedule` / `Schedule` / `repeatFrequency` / `RRULE`,
  which retires the 2026-07-26 mapping-cost question and shows the naive
  `eventSchedule` grep to be 15 false positives on the `EventScheduled` *status*
  enum. (2) The **per-target-host JSON-LD split is ~60/40** — 14 of 24 hosts carry
  `Event` JSON-LD, 5 carry JSON-LD with no `Event`, 5 carry none — closing the
  question open since 2026-07-17 and confirming the fallback ladder as a primary
  path. (3) **No `.ics`-only pages** exist in the corpus. Surfaced one new
  question (does `Event`-less JSON-LD mislead the generic extractor?). Added the
  `## Key insights` header the product-wiki pack began requiring on 2026-07-30.
