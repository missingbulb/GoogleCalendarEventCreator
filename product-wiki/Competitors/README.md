# Competitors

A self-growing survey of tools competing to do what this extension does: get an
event from a webpage onto a calendar with minimal friction. Not exhaustive — a
general lay of the land, kept current by the growth routine (see
[`dev/routines/product-wiki-growth/routine.md`](../../dev/routines/product-wiki-growth/routine.md)).
Sibling to [`../Market/`](../Market/README.md) (the calendar-market
landscape) and [`../Users/`](../Users/README.md) (who uses this
extension).

## Landscape (as of 2026-07-15)

| Tool | Approach | Notes |
|---|---|---|
| [Eventy](https://chromewebstore.google.com/detail/eventy/kfancgcbhdkeohknmidbnioccmmoknjl) | AI extraction from webpages, email, flyers, concert posters, even screenshots | Broadest input surface of the group; 4.4★ on the Chrome Web Store. Exports to Google Calendar or `.ics` (Outlook/Apple Calendar) — covers the multi-calendar gap this project doesn't (see Market open question). |
| [Add To Calendar](https://chromewebstore.google.com/detail/add-to-calendar/jnbpajadakhkpcncmbfhkgaaoioofkfd) | Highlight text → right-click → "Intelligent Technology" scan for title/date/time/address | 4.4★. Closest in spirit to a lightweight, single-purpose tool rather than a broad AI product. |
| [Calendar Event Creator](https://chromewebstore.google.com/detail/calendar-event-creator/nbdaijdcnmhjhoekcdcgdjcjheajgpad) | Select event text → right-click → OpenAI API extracts details | Requires an OpenAI-backed flow — a real friction point vs. "no API key" positioning. |
| [ChatGPT for Google Calendar](https://chromewebstore.google.com/detail/chatgpt-for-google-calend/laejdmahdkleahgkdpiapfdcmleedhca) | LLM-based extraction of title/date/time/location from any webpage | Google-Calendar-only, like this project, but LLM-dependent rather than rule-based + generic-fallback. |
| [Smart Calendars AI](https://www.smartcalendars.ai/en/articles/browser-extension-add-events) | "Turns what you're reading into ready-to-review calendar events" | Cross-browser (Chrome + Safari) — worth tracking if Safari support ever becomes relevant here. |
| [CalendarAdd](https://github.com/mattkrins/CalendarAdd) | Open-source Chrome extension: select text → Google Calendar event | Same "no server, no account" spirit as this project, but text-selection-only (no per-site structured extraction, no JSON-LD awareness). |
| Axiom.ai / Bardeen | General no-code browser-automation platforms; calendar event creation is one of many workflows, not a dedicated product | Not direct competitors for a casual user, but relevant if "add to calendar" ever gets framed as one automation among many rather than a single-purpose tool. |

## Positioning takeaways

- **Most competitors lean on a cloud AI/LLM API** (OpenAI or similar) for
  extraction, which typically means an account, a subscription, or at least a
  network call to a third party with the page's content. This project's
  rule-based per-site extractors + generic fallback (no OAuth, no API key, no
  content leaves the browser) is a real, defensible differentiator — worth
  stating explicitly in messaging/store listing copy, not just an implementation
  detail.
- **Multi-calendar export (`.ics`, Outlook, Apple Calendar) is common among
  AI-based competitors** (Eventy, Smart Calendars AI) but absent here — flagged
  as an open question in Market, now cross-referenced from the competitive
  angle too.
- **Ratings cluster around 4.4★** for the dedicated single-purpose tools — no
  major quality outlier found yet in this pass; revisit once review counts are
  gathered (not captured in this seed).
- **Cross-browser, the field is thinner and still selection-based.** Beyond the
  Chrome Web Store, Firefox carries "Create a Google Calendar Event" and "Checker
  Plus for Google Calendar" (highlight text → right-click → event), and
  Calendly / Smart Calendars AI span Chrome/Firefox/Edge/Safari — but these are
  right-click-selection or scheduling tools, not per-site structured extractors.
  No JSON-LD/microdata-aware competitor surfaced on Firefox/Edge either, so the
  structured-extraction niche is open cross-browser too, not just on Chrome.

## Open questions (for the next growth pass)

- Pull actual review counts / install counts where the Chrome Web Store exposes
  them, to gauge relative traction, not just star ratings.
- Is there a competitor doing per-site *structured* extraction (JSON-LD/microdata
  aware) rather than generic AI-on-raw-text? Still none found — now checked across
  Chrome, Firefox, and Edge (see the cross-browser note above). Worth periodic
  re-checks, since that's closest to this project's approach.
- Safari-native tools weren't reachable in this pass (no store scan) — a later
  cycle should confirm whether the Safari picture differs from Chrome/Firefox.

## Sources

- [Browser Extension: Add Calendar Events from Any Webpage (Smart Calendars AI)](https://www.smartcalendars.ai/en/articles/browser-extension-add-events)
- [Eventy — Chrome Web Store](https://chromewebstore.google.com/detail/eventy/kfancgcbhdkeohknmidbnioccmmoknjl)
- [Calendar Event Creator — Chrome Web Store](https://chromewebstore.google.com/detail/calendar-event-creator/nbdaijdcnmhjhoekcdcgdjcjheajgpad)
- [ChatGPT for Google Calendar — Chrome Web Store](https://chromewebstore.google.com/detail/chatgpt-for-google-calend/laejdmahdkleahgkdpiapfdcmleedhca)
- [Add To Calendar — Chrome Web Store](https://chromewebstore.google.com/detail/add-to-calendar/jnbpajadakhkpcncmbfhkgaaoioofkfd)
- [CalendarAdd (GitHub)](https://github.com/mattkrins/CalendarAdd)
- [20 Best Google Calendar Extensions for Chrome (SavvyCal)](https://savvycal.com/articles/google-calendar-extension/)
- [Create a Google Calendar Event — Firefox Browser Add-ons](https://addons.mozilla.org/en-US/firefox/addon/create-a-google-calendar-event/)
- [Checker Plus for Google Calendar — Firefox Browser Add-ons](https://addons.mozilla.org/en-US/firefox/addon/checker-plus-for-calendar/)

## Growth log

- **2026-07-15** — initial seed (folder scaffolding + first competitive scan).
- **2026-07-17** — ran the cross-browser scan (open question): Firefox has
  selection-based "Create a Google Calendar Event" and "Checker Plus"; Calendly /
  Smart Calendars AI span Chrome/Firefox/Edge/Safari — all right-click/scheduling,
  none per-site structured. No JSON-LD-aware rival on Firefox/Edge either.
  Resolved the cross-browser question; narrowed the structured-extraction one to
  "Safari still unchecked".
