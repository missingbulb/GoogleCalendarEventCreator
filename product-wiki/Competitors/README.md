# Competitors

A self-growing survey of tools competing to do what this extension does: get an
event from a webpage onto a calendar with minimal friction. Not exhaustive — a
general lay of the land, kept current by the Claudinite **product-wiki** pack's
growth worker (mounted read-only under `.claudinite/`).
Sibling to [`../Market/`](../Market/README.md) (the calendar-market
landscape) and [`../Users/`](../Users/README.md) (who uses this
extension).

## Key insights

- Nobody today wires a page's structured event data to a calendar — JSON-LD tools only inspect it.
- The one extension that ever read page markup into a calendar had 5M+ users and shut down anyway.
- It died of platform-integration load — Google's own change requests and an OAuth calendar sync — not of reading pages.
- Most rivals need a cloud LLM, hence an account or an API key; nothing-leaves-the-browser is an open lane.
- Multi-calendar `.ics` export is table stakes for the AI rivals and absent here.
- Safari and Firefox are no different, and lean further toward OCR and screenshots than toward markup.
- Chrome Web Store install counts are unobtainable — the store and its mirrors 403 automated fetchers.

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
- **The structured-extraction lane was occupied once, at microformat scale, and
  then vacated (checked 2026-07-26).** This sharpens the standing "still none
  found" answer into something more useful than absence. The closest thing that
  ever shipped was the **"Google Calendar" Chrome extension** — a hackathon
  project *"encouraged by the Chrome and Calendar teams at Google"*, since
  open-sourced and archived — which detected events on the page you were reading
  via the **`hCalendar` microformat and derivative microformats** and offered a
  one-click add. It is now **shut down**: the repo states *"This Chrome extension
  is no longer available to install, though the source code is available here to
  fork & modify"*, and the author's shutdown note cites request load from Google
  teams outweighing his available time, not lack of demand — the extension had
  **5MM+ users** at shutdown. The generic **"Microformats"** extension (exported
  `hCalendar` → iCalendar / add to Google Calendar) is likewise reported delisted
  and unmaintained since ~2014. Two readings, both worth carrying: the lane is
  genuinely empty *today*, and its last occupant died of maintenance cost at
  scale. ~~the exact cost a rule-based per-site extractor set also accrues.~~
  **That last clause was wrong and is corrected below (2026-08-09):** the 2026-07-26
  pass inferred which maintenance cost killed the incumbent instead of reading the
  shutdown note, and the note names a different one — the Google-facing
  integration surface, not the page reader. See the next bullet.
- **The incumbent died of *platform integration*, not of reading pages (checked
  2026-08-09).** The shutdown note is specific about the load: *"the number of
  requests I have received from various teams at Google to make changes … far
  outweigh the amount of time I am able to spend on it"*, after the author's
  attempts to get Google's Calendar team to adopt the extension onto their
  first-party roadmap were declined. And the project's own docs show where that
  Google-facing surface came from: from v1.5 the extension *"uses the
  industry-standard OAuth protocol to fetch your calendar"*, a rewrite forced
  when *"Google turned off version 2 of the Google Calendar Data API in November
  2014, which had earlier made it possible to re-use your browser
  credentials"* — i.e. it maintained a live, authenticated, deprecation-exposed
  integration with a Google API, on top of an agenda/preview surface. Nothing in
  either account attributes the burden to the `hCalendar` page reader. The
  precedent's warning is therefore **narrow and inverted**: the cost that killed
  it attaches to exactly the OAuth/API-integration surface this project
  deliberately does not have (no sign-in, no API key, a plain
  `render?action=TEMPLATE` URL). Per-site extractor maintenance is a real cost
  here, but this precedent is *not* evidence for it, and the earlier reading that
  it was should not be relied on.
- **Structured-data awareness and calendar creation are disjoint categories in
  today's extension ecosystem.** JSON-LD-aware extensions are easy to find and
  effectively commoditised — **JSON-LD Schema Extractor** (Chrome *and* Firefox),
  **LD+JSON Extractor**, **JSON-LD Checker**, **SEO Schema Visualizer** — but every
  one is an SEO/developer *inspection* tool: extract, pretty-print, validate, or
  graph a page's structured data against schema.org. None turns an `Event` block
  into a calendar entry. So the answer to "is anyone doing per-site structured
  extraction?" is not that the capability is hard or rare — it is that nobody has
  wired the commodity parsing side to the calendar side. That junction is
  precisely this project's lane. (Caveat, same as the Safari findings: the store
  listings themselves return HTTP 403 to this worker's fetcher, so these rest on
  search-surfaced listing descriptions; the two GitHub sources below were read
  end to end.)
- **Safari, checked 2026-07-26, does not differ — and if anything leans further
  from structured extraction.** Three layers, none of them a per-site markup
  reader: (1) *browser extensions* — Smart Calendars AI is the one genuine
  event-capture extension spanning Chrome and Safari, and its own description
  puts it on **text and image recognition** plus select-text-on-a-page capture,
  never schema.org/JSON-LD; Calendly ships a Safari extension through the Mac App
  Store, but it is a scheduling-link tool, not an extractor. (2) *Standalone App
  Store apps taking the image route* — EventShot (Image To Calendar) and
  Screenshots to Calendar both turn a **screenshot** into an event (title, date,
  time, location; the latter also claims recurring-event and
  multiple-events-per-image detection). (3) *Apple's own OS-level path* is **Data
  Detectors**, which recognises dates in text and offers to create a Calendar
  event — but Apple documents it for Mac document apps (Mail, TextEdit, Preview),
  not as a Safari webpage-markup feature. So the structured-extraction niche is
  open on Safari too, and the Safari-native centre of gravity is OCR/text
  detection — the opposite end of the ladder from JSON-LD.
- **Screenshot/OCR capture is emerging as a distinct input axis.** Eventy already
  advertised flyer/poster/screenshot input; the Safari scan turned up two more
  image-first tools. This project has no answer to it by design — it reads the
  page's markup, and a screenshot has none — but the two approaches fail on
  opposite inputs, so this is a positioning question rather than a feature gap.

## Open questions (for the next growth pass)

- Pull actual review counts / install counts where the Chrome Web Store exposes
  them, to gauge relative traction, not just star ratings. **Attempted
  2026-07-26 and blocked, not answered:** both `chromewebstore.google.com`
  listing pages and the third-party `chrome-stats.com` mirror return HTTP 403 to
  the growth worker's fetcher, and web search surfaces the star ratings but not
  install counts. This needs a different data route (a human spot-check, or a
  source that publishes the numbers as text) — re-attempting the same two hosts
  will just burn the next pass's budget.
- ~~Is there a competitor doing per-site *structured* extraction (JSON-LD/microdata
  aware) rather than generic AI-on-raw-text?~~ **Answered 2026-07-26**, in two
  parts, having been checked across Chrome, Firefox, Edge, **and Safari**: none
  live today, and the reason is sharper than absence — the capability is
  commoditised on the SEO/inspection side and simply unwired from any calendar,
  while the one microformat-aware calendar extension that did ship is shut down
  (see the two notes under Positioning takeaways). Still worth a periodic
  re-check, but not open in its old form.
- ~~**Why did the incumbent vacate, and does that predict our cost curve?**~~
  **Answered 2026-08-09**, and it came out the second way: the load was the
  calendar/OAuth integration surface (plus Google teams' own change requests),
  not the microformat page reader — see the "died of platform integration"
  bullet under Positioning takeaways. It does **not** predict this project's
  per-site extractor cost curve, and the 2026-07-26 claim that it did has been
  corrected in place.
- **What *is* this project's own extractor maintenance cost curve?** The
  incumbent precedent turned out not to answer it, so it is genuinely open: how
  often does a landed per-site extractor break as its site changes, and does that
  rate scale with the number of extractors? Unlike the questions above this one
  is answerable from repo-native signal (the repo's own extractor-fix commits and
  re-record runs), not the web. Surfaced 2026-08-09.
- **Would a JSON-LD-era equivalent be re-tried by a platform player?** The prior
  attempt predates JSON-LD's dominance (~41% of pages vs microformats' sub-1% —
  see [`../Domain/`](../Domain/README.md)). If the lane is empty mainly for
  historical reasons, platform re-entry is a live competitive risk to track.
  Surfaced 2026-07-26.
- ~~Safari-native tools weren't reachable in this pass (no store scan).~~
  **Answered 2026-07-26** — see the Safari bullet under Positioning takeaways: the
  picture does not differ, and skews to OCR/text detection. Evidence caveat: the
  same 403 wall that blocked the install-count question also blocked direct
  fetches of the App Store and vendor listings, so the Safari findings rest on
  search-result summaries of those listings rather than the listings read end to
  end. A pass with a working fetcher should confirm the two image-first apps.
- Does the image/screenshot input axis (Eventy, EventShot, Screenshots to
  Calendar) draw users this project would otherwise reach, or is it serving a
  genuinely different moment — a photographed poster, not a page you're reading?
  Surfaced 2026-07-26.

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
- [Calendly: Browser Extension — Mac App Store](https://apps.apple.com/us/app/calendly-browser-extension/id6746816242?mt=12) — the Safari extension is a scheduling-link tool, not an extractor
- [How to install Calendly for Safari — Calendly Help](https://calendly.com/help/how-to-install-calendly-for-safari)
- [EventShot — Image To Calendar (App Store)](https://apps.apple.com/us/app/-/id6747011235) — screenshot → event
- [Screenshots to Calendar (App Store)](https://apps.apple.com/app/id6757425886) — screenshot → event, incl. recurring and multi-event images
- [Detect dates, contacts, and more in documents on Mac — Apple Support](https://support.apple.com/guide/mac-help/detect-dates-contacts-documents-mac-mh35744/mac) — Data Detectors, Apple's OS-level date→Calendar path
- [Safari Extensions — Apple Developer](https://developer.apple.com/safari/extensions/)
- [chimbori/google-calendar-crx — the shut-down "Google Calendar" Chrome extension (archived; shutdown notice, "encouraged by the Chrome and Calendar teams at Google", 5MM+ users)](https://github.com/chimbori/google-calendar-crx)
- [thanhpd/google-calendar-crx — fork documenting its hCalendar/hResume microformat event detection](https://github.com/thanhpd/google-calendar-crx)
- [Accounts and Authorization — chimbori/google-calendar-crx wiki](https://github.com/chimbori/google-calendar-crx/wiki/Accounts-and-Authorization) — "uses the industry-standard OAuth protocol to fetch your calendar" after Google turned off Calendar Data API v2 in November 2014
- [JSON-LD Schema Extractor — Chrome Web Store](https://chromewebstore.google.com/detail/json-ld-schema-extractor/njmjjilneheaknlfjidccmnceidcjnop)
- [JSON-LD Schema Extractor — Firefox Browser Add-ons](https://addons.mozilla.org/en-US/firefox/addon/json-ld-schema-extractor/)
- [LD+JSON Extractor — Chrome Web Store](https://chromewebstore.google.com/detail/ld+json-extractor/ndkafkinnogfnhllmidiflkgdcijgdnn)
- [JSON-LD Checker — Chrome Web Store](https://chromewebstore.google.com/detail/json-ld-checker/jdddgiebgdijpopfapkocdnnbgkhddln)
- [SEO Schema Visualizer — JSON-LD graph](https://www.shtros.com/seo-schema-visualizer/)
- [Microformats — Chrome extension listing (chrome-stats)](https://chrome-stats.com/d/oalbifknmclbnmjlljdemhjjlkmppjjl)

## Growth log

- **2026-07-15** — initial seed (folder scaffolding + first competitive scan).
- **2026-07-17** — ran the cross-browser scan (open question): Firefox has
  selection-based "Create a Google Calendar Event" and "Checker Plus"; Calendly /
  Smart Calendars AI span Chrome/Firefox/Edge/Safari — all right-click/scheduling,
  none per-site structured. No JSON-LD-aware rival on Firefox/Edge either.
  Resolved the cross-browser question; narrowed the structured-extraction one to
  "Safari still unchecked".
- **2026-07-26** — attempted the install/review-count open question and recorded
  the negative result rather than guessing: the Chrome Web Store and
  chrome-stats.com both refuse the growth worker's fetcher (HTTP 403), so no
  traction numbers were obtainable this pass. Noted in the open question so the
  next run tries a different route. No competitor-landscape claims changed.
- **2026-07-26 (same pass, second half)** — closed the "Safari still unchecked"
  question, the one open question this page could still answer without the blocked
  hosts. Safari has no per-site structured extractor either: Smart Calendars AI
  (Chrome + Safari) is text/image recognition, Calendly's Safari extension is
  scheduling-only, the App Store's event tools (EventShot, Screenshots to
  Calendar) are screenshot-to-event apps rather than browser extensions, and
  Apple's own date→Calendar path is Data Detectors, an OS text feature documented
  for document apps rather than Safari page markup. Added the Safari and
  screenshot/OCR bullets with six sources, recorded the same 403 evidence caveat,
  and surfaced a follow-up on whether the image-input axis competes for the same
  moment.
- **2026-07-26 (third pass)** — answered the long-standing structured-extraction
  question rather than re-recording "none found". Historically the lane *was*
  occupied: the Google-encouraged "Google Calendar" Chrome extension read
  `hCalendar`/derivative microformats off the page and one-click-added the event;
  it is archived and no longer installable, shut down over maintenance load at
  5MM+ users rather than lack of demand (the "Microformats" hCalendar→iCalendar
  extension is likewise delisted). Today, JSON-LD awareness is commoditised but
  disjoint from calendars — JSON-LD Schema Extractor (Chrome+Firefox), LD+JSON
  Extractor, JSON-LD Checker and SEO Schema Visualizer are all SEO/dev inspection
  tools, none of which creates an event. Retired the old question and opened two
  sharper ones (why the incumbent vacated; whether a JSON-LD-era platform
  re-entry is a risk). Same 403 caveat on the store listings; the two GitHub
  sources were read end to end.
- **2026-08-09** — answered "why did the incumbent vacate", and it **corrected a
  claim this page made two weeks earlier**. The shutdown note attributes the load
  to change requests from Google teams after the Calendar team declined to adopt
  the extension, and the project's own wiki shows the extension carried an
  **OAuth integration with the Google Calendar Data API** (forced by Google
  killing API v2 in November 2014). Neither source blames the `hCalendar` reader.
  So the 2026-07-26 clause reading the shutdown as "the exact cost a rule-based
  per-site extractor set also accrues" was an inference, not a finding — struck
  in place with a note rather than deleted, and replaced with the sourced
  version. Retired the open question and opened a sharper, repo-answerable one
  (this project's own extractor breakage rate). Also added the standard-required
  `## Key insights` header, which this page had been missing.
