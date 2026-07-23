# Users

A self-growing wiki of the people who use (or would use) this extension, and how
— usage patterns, personas, and pain points. Its sibling wikis cover the other
tools chasing the same job ([`../Competitors/`](../Competitors/README.md))
and the broader calendar-market context these users sit in
([`../Market/`](../Market/README.md)).

## How this wiki grows

Same mechanic as Market — the Claudinite **product-wiki** pack's growth worker
(mounted read-only under `.claudinite/`), following the "LLM Wiki" pattern:
compile once, refine in place, cite sources,
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
  [`../Competitors/README.md`](../Competitors/README.md). This concern is
  well-grounded, not niche: 2026 studies report **86% of the top-100 Chrome
  extensions request high-risk permissions at install**, **52% of AI-branded
  extensions collect user data** (~1 in 3 collecting PII), and **71% of extensions
  publish no privacy policy** — and Chrome grants permissions at install that
  persist across every future update. A rule-based, no-OAuth, no-API-key,
  nothing-leaves-the-browser design answers exactly this anxiety.

## Usage patterns

- Single click → review pre-filled Google Calendar event → save. The extension
  deliberately stops short of auto-saving, so the user always reviews before
  committing (see `dev/requirements/requirements.md`).
- Works from whatever page the user is already on — no search, no lookup, no
  separate "paste a URL" step, unlike several competitor tools (see
  `../Competitors/README.md`).

## Pain points to track (hypotheses — verify with real feedback as it arrives)

- Extraction misses or gets a field wrong on a page with unusual markup — the
  fallback-coverage routine (`.claudinite/local/packs/gcec/tasks/fallback-extractor-improvements/`) is the
  engineering mechanism that narrows this over time; this wiki tracks it from the
  *user* side (which misses actually get reported/matter).
- Timezone correctness on pages that don't declare one clearly — see
  `derive-timezone.js`'s unanimity rule in `technicalGotchas.md`; a wrong `ctz` is
  a trust-breaking failure mode worth watching from the user's perspective.
- No support yet for calendars other than Google Calendar (see Market's open
  question on Outlook/ICS) — track whether this actually blocks real users or is
  a hypothetical gap.

## Open questions

- Do real users cite privacy/permissions as a *reason for choosing* a lightweight
  extension, or is it a latent preference they don't act on? (The permission-risk
  data above is industry-wide, not this extension's own user feedback.)
- Which extraction misses actually get reported vs. silently tolerated — i.e.
  which sites matter enough to users to warrant a dedicated extractor?
- Does the lack of non-Google-Calendar support actually block real users? (Pairs
  with Market's `.ics`-export note.)

## Sources

Personas and pain points above are hypotheses seeded from the product's existing
design decisions (`dev/procedures/highLevelDesign.md`,
`dev/requirements/requirements.md`) and general competitor positioning (see
`../Competitors/README.md`'s sources) — not yet from direct user research. Flag this
clearly until real user feedback (reviews, issues, support requests) backs a
claim here. The one externally-sourced claim so far is the industry
permission/privacy data backing the privacy-conscious persona:

- [Ranking AI-Powered Chrome Extensions by Privacy Risk in 2026 (Incogni)](https://blog.incogni.com/chrome-extensions-privacy-2026/)
- [Chrome Permissions Statistics 2026 (AboutChromebooks)](https://www.aboutchromebooks.com/chrome-permissions-statistics/)
- [Enterprise Browser Extension Security Report 2026 (LayerX)](https://go.layerxsecurity.com/browser-extension-security-report-2026)

## Growth log

- **2026-07-15** — initial seed (folder scaffolding + first pass, hypotheses
  pending real user-feedback sourcing).
- **2026-07-17** — added the required `## Open questions` section; backed the
  privacy-conscious persona with 2026 industry data on extension permission/PII
  collection and missing privacy policies (Incogni, AboutChromebooks, LayerX) —
  the first externally-sourced claim in this wiki.
