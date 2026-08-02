# Market

A self-growing wiki of the market environment this extension operates in: what
calendar platforms exist, what kinds of pages people extract events from, and
what usage patterns show up in that market. Distinct from
[`../Users/`](../Users/README.md) (who uses *this* extension and how) and
[`../Competitors/`](../Competitors/README.md) (who else builds this).

## Key insights

- Web-based calendars are the largest slice of a ~$14.6B market, so a browser extension sits where the users are.
- The portable multi-calendar path is a standards `.ics` file, not per-vendor Outlook or Apple deep links.
- But an `.ics` is a download, which reintroduces exactly the friction the render URL removes.
- Google Calendar is only ~23% of the calendar-tool market, yet it is the only sink this extension targets.
- Structured markup is common page-wide; that does not mean most *event* pages are structured.
- Google Calendar is reported in use at 637,000+ companies, most of them US-based.
- Only 14 of this project's 24 recorded target hosts publish Event JSON-LD, so the fallback path carries real traffic.

## How this wiki grows

This follows Andrej Karpathy's ["LLM Wiki" pattern](https://medium.com/@urvvil08/andrej-karpathys-llm-wiki-create-your-own-knowledge-base-8779014accd5):
instead of re-deriving market context from scratch on every question, an agent
**compiles** findings into this file once and **refines it in place** on later
passes — later runs read what's already here before researching, extend or
correct it, cite every claim, and only prune a claim when it's superseded (never
silently). The mechanic (schedule, what counts as a real update, when to open a
PR) is owned by the Claudinite **product-wiki** pack's growth worker (mounted
read-only under `.claudinite/`).
Nothing in this file is guaranteed current — check the growth log's date and
treat older entries as a starting point to verify, not ground truth.

## Calendar platform landscape (as of 2026-07-15)

- The calendar-app market was valued around **$14.6B in 2025**, projected to grow
  at roughly **10.8% CAGR through 2034**.
- **Google, Microsoft, and Apple** are the dominant players; Google Calendar and
  web Outlook together account for the majority of web-based platform usage.
  Google Calendar alone is reported in use at **637,000+ companies** in 2026 (62.6%
  US-based).
- **Web-based platforms held the largest share (38.2% in 2025)** of the calendar
  app market, ahead of native mobile/desktop apps — consistent with this
  extension's approach (a browser action, not a native app).
- Google Calendar's event-creation URL scheme
  (`calendar.google.com/calendar/render?action=TEMPLATE`) — what this extension
  targets — has no first-party equivalent this project currently uses for Outlook
  or Apple Calendar. Google Calendar is ~23% of the calendar-tool market (6sense),
  but the portable multi-calendar path is **`.ics` (RFC 5545)**, not per-vendor
  deep links: Outlook, Apple Calendar, and any RFC-5545 app both export and import
  it, and existing Chrome extensions (ics2gcal, ICS to GCal) already one-click a
  `.ics` into Google Calendar. So the export question is really "emit a standards
  `.ics`" rather than "add an Outlook deep link" — the same lever the AI
  competitors already pull (Eventy, Smart Calendars AI; see Competitors). Tradeoff:
  a `.ics` is a *download*, where the render URL is a no-download click-through —
  the exact friction this product optimises away.

## Event-source landscape (what pages people extract *from*)

Sites the extension already has dedicated extractors for (see
`extension/event-extractors/custom/` and `dev/requirements/extractor/`) are
themselves representative of the market: ticketing/listing platforms (e.g.
Meetup, Ticketmaster) and single-venue/organizer sites. Two broad source shapes
recur across the market:

- **Single-event pages** — a venue, a talk, a concert; one clear event, often with
  `schema.org`/JSON-LD event markup (the highest-signal, most future-proof
  extraction target — see the JSON-LD note in the **architecture rules of the
  road** section of `.claudinite/local/packs/gcec/RULES.md`; the
  `technicalGotchas.md` this line previously cited was superseded when that doc
  was folded into the gcec pack).
  Machine-readable markup is increasingly common because search engines reward it
  (Google's "Events" rich results), which is a structural tailwind for any
  extension that prefers JSON-LD/`og:` over brittle DOM scraping — but "common" is
  a *page-wide* fact, not an event-specific one, and this line overstated it until
  2026-07-26: JSON-LD reaches ~41% of pages and Microdata ~26%, while
  `schema.org/Event` specifically is on fewer than ~1M domains. The tailwind is
  real; it does not mean most event pages are structured. See
  [`../Domain/`](../Domain/README.md)'s format ranking.
- **Listing/series pages** — a calendar-of-events page with several entries; the
  extension already special-cases "one button per event" for this shape (see
  `product-requirements/README.md` requirement 4).

## Usage patterns / use cases

- **One-off personal use** — someone reads about a concert/talk/meetup in a
  newsletter, blog post, or social share and wants it on their calendar
  immediately, without leaving the page or typing anything.
- **Event discovery browsing** — scanning a listing/aggregator page and adding
  several events from one visit.
- **Professional scheduling from a webpage** — a conference agenda, a webinar
  registration page, an internal event site.

## Open questions (for the next growth pass)

- How much of the "AI-powered extraction" trend (see competitors wiki) is
  actually driven by JS-heavy SPA pages that a rule-based extractor + ScraperAPI
  render struggles with, vs. genuine accuracy gains from an LLM?
- If multi-calendar export is ever added, does the `.ics`-download step erode the
  no-download/no-account friction the render URL avoids? (Weigh against the reach
  gain — see the Outlook/`.ics` note above, resolved 2026-07-17.)
- What share of "event" pages in the wild already carry `schema.org/Event`
  JSON-LD vs. requiring DOM/text heuristics? (Would sharpen the fallback-coverage
  routine's generic-extraction priorities too — see
  `.claudinite/local/packs/gcec/tasks/fallback-extractor-improvements/task.md`.)
  **Answered web-wide in Domain, 2026-07-17** — `Event` markup is a minority
  signal (fewer than ~1M domains), so the DOM/`og:` fallback path carries real
  weight; see [`../Domain/README.md`](../Domain/README.md). The *per-target-host*
  half is now answered too — **2026-08-02**, by censusing the recorded extractor
  corpus: **14 of 24 target hosts carry `Event` JSON-LD**, 5 carry JSON-LD with no
  `Event`, 5 carry none. Both halves are recorded in Domain; nothing on this
  question stays open here.
- **Does the `Event`-less-JSON-LD host shape have a market reading?** 5 of 24
  target hosts publish JSON-LD (usually `Organization`/`WebSite` SEO boilerplate)
  without ever describing the event. If that is what SEO-tooling adoption without
  event-schema adoption looks like at scale, the "search engines reward markup"
  tailwind may be weaker for *event* pages than the page-wide numbers imply.
  Surfaced 2026-08-02.

## Sources

- [Calendar App Market Demand and Consumption Trends: Outlook 2026-2034](https://www.datainsightsmarket.com/reports/calendar-app-1930495)
- [Google Calendar - Market Share, Competitor Insights in Collaborative Calendars (6sense)](https://6sense.com/tech/calendar/google-calendar-market-share)
- [The 6 best calendar apps in 2026 (Zapier)](https://zapier.com/blog/best-calendar-apps/)
- [Calendar Applications Market Research Report 2034 (Dataintelo)](https://dataintelo.com/report/calendar-applications-market)
- [ics2gcal — import .ics into Google Calendar (GitHub)](https://github.com/fmeum/ics2gcal)
- [ICS to GCal — Chrome Web Store](https://chromewebstore.google.com/detail/ics-to-gcal/ljobcbehhifehkmamikmchekbbljopao)
- [Structured data — 2024 Web Almanac (HTTP Archive)](https://almanac.httparchive.org/en/2024/structured-data) — the ~41% JSON-LD / ~26% Microdata page-wide figures
- [Announcing the Schema.org usage statistics dataset (blog.schema.org, 2026)](https://blog.schema.org/2026/06/04/announcing-the-schema-org-usage-statistics-dataset/) — `schema.org/Event` on fewer than ~1M domains
- [`dev/requirements/extractor/data/server-fetched/` — this repo's recorded extractor corpus](https://github.com/missingbulb/GoogleCalendarEventCreator/tree/main/dev/requirements/extractor/data/server-fetched) — the 24-host census behind the 14/24 per-target-host split

## Growth log

- **2026-07-15** — initial seed (folder scaffolding + first research pass).
- **2026-07-17** — researched the Outlook/`.ics` export question: `.ics` (RFC 5545)
  is the portable multi-calendar lever (Outlook/Apple/any app import+export it;
  ics2gcal / ICS to GCal already do one-click Google Calendar import), not
  per-vendor deep links — folded into the platform-landscape note; opened a
  follow-up on the `.ics`-download-vs-render-URL friction tradeoff.
- **2026-07-26** — corrected a superseded repo reference (`technicalGotchas.md`
  was folded into the gcec pack's `RULES.md`; the JSON-LD note now lives in its
  *Codebase gotchas* section), and cross-linked the JSON-LD-prevalence open
  question to the answer Domain already recorded on 2026-07-17, leaving only the
  per-target-host split open here.
- **2026-07-26 (same pass, second half)** — pointed the RULES.md citation at the
  right section (**architecture rules of the road**, not *Codebase gotchas*), and
  qualified the "machine-readable markup is increasingly common" claim, which was
  true page-wide but overstated for *event* pages specifically — cited the ~41% /
  ~26% / <1M-domains figures here rather than leaving them only in Domain.
- **2026-08-09** — added the `## Key insights` header the product-wiki standard
  requires and this page had been missing (the `product-wiki-page-sections` and
  `product-wiki-key-insights` checks). Every bullet distils a claim already cited
  in the body below; no claim was added, changed, or removed, and no research was
  done on this page this pass.
- **2026-08-02** — closed the JSON-LD-prevalence open question's remaining
  *per-target-host* half with the measurement recorded in Domain (14 of 24 hosts
  carry `Event` JSON-LD; 5 carry JSON-LD without an `Event`; 5 carry none), and
  surfaced the market-side reading it raises: SEO-boilerplate JSON-LD without
  event schema would mean the rich-results tailwind is weaker on event pages than
  page-wide adoption suggests. Added the `## Key insights` header the
  product-wiki pack began requiring on 2026-07-30. No platform-landscape claim changed.
