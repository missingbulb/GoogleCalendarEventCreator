# Users

A self-growing wiki of the people who use (or would use) this extension, and how
— usage patterns, personas, and pain points. Its sibling wikis cover the other
tools chasing the same job ([`../Competitors/`](../Competitors/README.md))
and the broader calendar-market context these users sit in
([`../Market/`](../Market/README.md)).

## How this wiki grows

Same mechanic as Market — see
[`dev/routines/product-wiki-growth/routine.md`](../../dev/routines/product-wiki-growth/routine.md)
and the "LLM Wiki" framing there: compile once, refine in place, cite sources,
never silently overwrite.

## Personas (initial pass — refine as real usage signal appears)

- **The one-click saver.** Reads about a single event (a concert, a talk, a
  meetup) somewhere on the web and wants it on their calendar before they forget,
  with the least possible friction — no typing, no new account, no app switch.
  This is the extension's primary target today (see `product-requirements/`
  requirement 1).
- **The event browser.** Lands on a listing/series page with several events and
  wants to cherry-pick a few — served by the "one button per event" requirement.
- **The privacy-conscious user.** Actively avoids extensions that want an OAuth
  grant, an account, or send page content to a third-party AI API just to copy a
  date into a calendar. This persona is who the "no sign-in, no API key" product
  requirement is *for* — see the positioning notes in
  [`../Competitors/README.md`](../Competitors/README.md).

## Usage patterns

- Single click → review pre-filled Google Calendar event → save. The extension
  deliberately stops short of auto-saving, so the user always reviews before
  committing (see `dev/requirements/requirements.md`).
- Works from whatever page the user is already on — no search, no lookup, no
  separate "paste a URL" step, unlike several competitor tools (see
  `../Competitors/README.md`).

## Pain points to track (hypotheses — verify with real feedback as it arrives)

- Extraction misses or gets a field wrong on a page with unusual markup — the
  fallback-coverage routine (`dev/routines/auto-fallback-coverage/`) is the
  engineering mechanism that narrows this over time; this wiki tracks it from the
  *user* side (which misses actually get reported/matter).
- Timezone correctness on pages that don't declare one clearly — see
  `derive-timezone.js`'s unanimity rule in `technicalGotchas.md`; a wrong `ctz` is
  a trust-breaking failure mode worth watching from the user's perspective.
- No support yet for calendars other than Google Calendar (see Market's open
  question on Outlook/ICS) — track whether this actually blocks real users or is
  a hypothetical gap.

## Sources

Personas and pain points above are hypotheses seeded from the product's existing
design decisions (`dev/procedures/highLevelDesign.md`,
`dev/requirements/requirements.md`) and general competitor positioning (see
`../Competitors/README.md`'s sources) — not yet from direct user research. Flag this
clearly until real user feedback (reviews, issues, support requests) backs a
claim here.

## Growth log

- **2026-07-15** — initial seed (folder scaffolding + first pass, hypotheses
  pending real user-feedback sourcing).
