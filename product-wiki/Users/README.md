# Users

A self-growing wiki of the people who use (or would use) this extension, and how
— usage patterns, personas, and pain points. Its sibling wikis cover the other
tools chasing the same job ([`../Competitors/`](../Competitors/README.md))
and the broader calendar-market context these users sit in
([`../Market/`](../Market/README.md)).

## Key insights

- Every extractor request so far was filed by the repo owner — no outside user has ever reported a miss.
- The in-product report channel opens a prefilled GitHub issue, so reporting at all needs a GitHub account.
- What blocks a fix is usually page capture, not extraction: sites that 403 datacenter IPs can't be recorded.
- Reported demand skews to Israeli and civic sites, not the global ticketing platforms.
- Industry data backs the privacy persona: most top Chrome extensions ask for high-risk permissions at install.
- Because the extension refuses to guess a timezone, expect "no timezone" complaints, not "wrong time" ones.
- The personas here are still hypotheses — no review, support request or outside feedback has landed yet.

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

## Reported-demand signal (repo-native, checked 2026-08-23)

The first *observable* answer to "which misses actually get reported" — and it is
mostly a negative one. As of 2026-08-23 the repo carries **14 issues labelled
[`extractor-request`](https://github.com/missingbulb/GoogleCalendarEventCreator/issues?q=label%3Aextractor-request)**,
and **every one was filed by the repo owner** (`missingbulb`) — the same
owner-only pattern that held at 13 on 2026-08-09 still holds two weeks and one
filing later. No external reporter appears anywhere in that set. So the
personas and pain points below still rest on zero outside feedback; what
follows is signal about the *channel* and about one person's browsing, not
about a user base.

- **The channel exists, is in-product, and fires at the failure moment — but it
  is gated behind a GitHub account.** The popup's unsupported-host states carry
  two affordances (`extension/events-popup/source-request-view.js`): a "Suggest
  Correction" link when the generic extractor found a complete event on an
  unlisted host, and a "Disagree?" link that expands an inline "how this
  extension finds events" explanation ending in "open an issue". Both land the
  user on the repo's prefilled `extractor-request` issue form in a new tab —
  "no token, form service, or backend involved". Note the design *changed* from
  what was originally asked for: issue
  [#96](https://github.com/missingbulb/GoogleCalendarEventCreator/issues/96)
  specified an **embedded Google Form** in the empty state, and the shipped
  implementation is a GitHub issue form instead, because GitHub forbids framing
  its pages (`X-Frame-Options`). The consequence for this wiki is the point: a
  reporter must be a logged-in GitHub user. That is a plausible — and
  **unverified** — explanation for why the external-report count is zero, and it
  is a friction this product otherwise spends all its design budget removing.
- **Reported demand skews local and civic, not global-platform.** Of the twelve
  site-specific requests, **eight name Israeli hosts** (`tel-aviv.gov.il`,
  `comy.co.il`, `cinema.co.il`, `secrettelaviv.com`, `barby.co.il`,
  `eventim.co.il`, `thinkdrink.co.il`, and `ticketmaster.co.il` — the local
  edition of a global platform), against only two genuinely international ones
  (`axs.com`, `bandsintown.com`). With a single reporter this is one person's
  browsing rather than a market shape, but it is worth holding as a hypothesis:
  the pages a person actually wants on their calendar are the small civic and
  venue sites near them, which are also the sites least likely to be served by a
  general AI tool trained on the majors.
- **A reported miss can be unfixable for reasons the user never sees — and the
  blocker is page *capture*, not extraction.** The `axs.com` request
  ([#285](https://github.com/missingbulb/GoogleCalendarEventCreator/issues/285))
  was abandoned: AXS returns HTTP 403 to CI runners and the sandbox, so no real
  page HTML could be recorded, the pipeline refuses to invent `expected` values
  for a test case, and the owner closed it with *"Can't get the html to write an
  extractor for."* The `bandsintown.com` request
  ([#170](https://github.com/missingbulb/GoogleCalendarEventCreator/issues/170))
  hit the identical 403 wall — the extractor was written but left uncompleted
  until a real browser supplied the page, after which it landed
  ([PR #199](https://github.com/missingbulb/GoogleCalendarEventCreator/pull/199)).
  So the sites most aggressive about bot-blocking are the ones least likely to
  gain a dedicated extractor, and from the user's side this looks like an
  arbitrary, permanent "no events found".
- **The channel also gets used for a second, quieter purpose: hardening
  coverage on an already-supported site, not just reporting a miss.** The one
  new `extractor-request` since 2026-08-09 —
  [#880](https://github.com/missingbulb/GoogleCalendarEventCreator/issues/880),
  `edfringe.com`, filed 2026-08-11 — reads like the other twelve site-specific
  requests, but `edinburghfringe.js` had already existed since the 2026-06-22
  extractor restructure; the PR that closed it,
  [#881](https://github.com/missingbulb/GoogleCalendarEventCreator/pull/881),
  added a second recorded page, hardening an extractor that was already
  shipping, not new site support. Excluded from the local/civic-skew count
  below for that reason (it isn't a new-host demand signal), but it is a real
  use of the same form, filed by the same owner — the channel's only
  documented user treats it as a general-purpose "make this extractor better"
  form as much as a "this site doesn't work" one.

## Pain points to track (hypotheses — verify with real feedback as it arrives)

- Extraction misses or gets a field wrong on a page with unusual markup — the
  weekly
  [`generic-extractor-improvements`](https://github.com/missingbulb/GoogleCalendarEventCreator/blob/main/.claudinite/local/packs/gcec/tasks/generic-extractor-improvements/task.md)
  task (named `fallback-extractor-improvements` until the 2026-07-26 restructure
  retired the "fallback" vocabulary) is the engineering mechanism that narrows
  this over time; this wiki tracks it from the *user* side (which misses actually
  get reported/matter).
- Timezone correctness on pages that don't declare one clearly — see the
  unanimity rule in the contract header of
  `extension/event-extractors/helpers/derive-timezone.js` (a zone is emitted only
  when two independent page-declared hints agree, otherwise none). The
  `technicalGotchas.md` this line cited until 2026-07-26 was superseded when that
  doc was folded into the gcec pack; the rule did **not** move into that pack's
  RULES.md, it lives in the source file's own header. A wrong `ctz` is a
  trust-breaking failure mode worth watching from the user's perspective — and
  because the contract refuses to guess, the *user-visible* failure is usually a
  **missing** timezone rather than a wrong one, so the complaint shape to expect
  in feedback is "it didn't set the timezone", not "it set the wrong time".
- No support yet for calendars other than Google Calendar (see Market's open
  question on Outlook/ICS) — track whether this actually blocks real users or is
  a hypothetical gap.
- **A site that blocks automated fetching stays unsupported indefinitely**, and
  the user is never told why. Verified 2026-08-09 on `axs.com` and
  `bandsintown.com` (see the reported-demand section above): the request path
  needs a captured copy of the page to write a test case against, and a site
  that returns HTTP 403 to datacenter IPs never yields one. This is a distinct
  pain point from "unusual markup" above — the extraction is not the hard part.
- **Reporting a miss requires a GitHub account.** The in-product "Suggest
  Correction" / "open an issue" affordances open the repo's prefilled issue form
  (`extension/events-popup/source-request-view.js`), so a user without a GitHub
  login has no way to report at all. Watch whether this is what keeps outside
  reports at zero.

## Open questions

- Do real users cite privacy/permissions as a *reason for choosing* a lightweight
  extension, or is it a latent preference they don't act on? (The permission-risk
  data above is industry-wide, not this extension's own user feedback.)
- ~~Which extraction misses actually get reported vs. silently tolerated — i.e.
  which sites matter enough to users to warrant a dedicated extractor?~~
  **Answered in the negative, 2026-08-09**: all 13 `extractor-request` issues to
  date are the repo owner's, so *no* miss has ever been reported by an outside
  user. The question that replaces it is the one below, about the channel.
- **Is the GitHub-account gate what keeps outside reports at zero?** The only
  report path is a prefilled GitHub issue form (see the reported-demand section).
  Worth deciding whether a no-account channel is worth building, or whether the
  zero simply reflects a small install base — the two are indistinguishable from
  inside the repo, and install counts are still unobtainable (see
  [`../Competitors/`](../Competitors/README.md)'s standing open question).
  Surfaced 2026-08-09.
- **Is the local/civic skew in reported demand a property of the demand or of
  the single reporter?** Eight of twelve site requests name Israeli hosts. If it
  is real, it argues the product's edge is small venue and civic sites rather
  than the ticketing majors an AI competitor covers by default; if it is just
  one person's browsing, it should not steer extractor priorities. Only outside
  reports can separate the two. Surfaced 2026-08-09.
- Does the lack of non-Google-Calendar support actually block real users? (Pairs
  with Market's `.ics`-export note.)
- On timezone, which complaint shape actually shows up — "wrong time" or "no
  timezone at all"? The refusal-to-guess contract predicts the latter dominates;
  no real feedback yet either way (surfaced 2026-07-26).

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

The 2026-08-09 pass added the first *repo-native* user-side evidence — the
reported-demand section above. These are this project's own issues and code, not
user research, and are labelled as such wherever they are used:

- [All `extractor-request` issues (14 as of 2026-08-23, all filed by the repo owner)](https://github.com/missingbulb/GoogleCalendarEventCreator/issues?q=label%3Aextractor-request)
- [#96 — the original "embed a Google Form in the popup" request](https://github.com/missingbulb/GoogleCalendarEventCreator/issues/96) — shipped instead as a prefilled GitHub issue form
- [#285 — `axs.com`, abandoned: HTTP 403 blocks page capture](https://github.com/missingbulb/GoogleCalendarEventCreator/issues/285) — owner: "Can't get the html to write an extractor for."
- [#170 — `bandsintown.com`, same 403 wall, completed only from a browser-saved page](https://github.com/missingbulb/GoogleCalendarEventCreator/issues/170)
- [PR #199 — the bandsintown extractor that eventually landed](https://github.com/missingbulb/GoogleCalendarEventCreator/pull/199)
- [#880 — `edfringe.com`, filed 2026-08-11, a hardening request on an already-supported host](https://github.com/missingbulb/GoogleCalendarEventCreator/issues/880)
- [PR #881 — added a second recorded page to `edinburghfringe.js`, present since the 2026-06-22 restructure](https://github.com/missingbulb/GoogleCalendarEventCreator/pull/881)

## Growth log

- **2026-07-15** — initial seed (folder scaffolding + first pass, hypotheses
  pending real user-feedback sourcing).
- **2026-07-17** — added the required `## Open questions` section; backed the
  privacy-conscious persona with 2026 industry data on extension permission/PII
  collection and missing privacy policies (Incogni, AboutChromebooks, LayerX) —
  the first externally-sourced claim in this wiki.
- **2026-07-26** — corrected a superseded repo reference in the timezone pain
  point: `dev/procedures/technicalGotchas.md` no longer exists (folded into the
  gcec pack's `RULES.md`, *Codebase gotchas*), and `derive-timezone.js` lives at
  `extension/event-extractors/helpers/`. No new user-side research this pass —
  the personas and pain points here still await real feedback signal.
- **2026-07-26 (same pass, second half)** — corrected the replacement citation
  written earlier the same day: the unanimity rule did not move into the gcec
  pack's RULES.md, it lives in `derive-timezone.js`'s own contract header. Reading
  that contract also yielded a user-side implication worth tracking — refusing to
  guess makes a *missing* timezone the expected complaint shape rather than a
  wrong one — added as an open question to check against real feedback.
- **2026-08-09** — answered the standing "which misses get reported" question
  with the repo's own record rather than leaving it open for a fourth pass, and
  answered it *negatively*: all 13 `extractor-request` issues were filed by the
  repo owner, so this wiki still has no outside user signal. Added a
  **Reported-demand signal** section with three findings — the report channel is
  in-product but gated behind a GitHub account (issue #96 asked for an embedded
  Google Form; `X-Frame-Options` forced a prefilled GitHub issue form instead);
  reported demand skews Israeli/civic eight-of-twelve; and a reported miss can
  be blocked by **page capture** rather than extraction (`axs.com` #285
  abandoned at HTTP 403, `bandsintown.com` #170 rescued only from a
  browser-saved page). Added the last two as pain points, retired the answered
  question and opened two sharper ones (is the account gate the cause of the
  zero; is the local skew demand or one reporter). Also added the
  standard-required `## Key insights` header, which this page had been missing.
- **2026-08-16** — spot-check only: repointed a dead reference in the
  unusual-markup pain point. The `fallback-extractor-improvements` task was
  renamed `generic-extractor-improvements` in the 2026-07-26 restructure that
  retired the "fallback" vocabulary, so the cited path no longer existed. No claim
  added, changed or removed, and no user-side research was done this pass — the
  run's research went to Domain and Competitors.
- **2026-08-23** — refreshed the reported-demand signal: one new
  `extractor-request` issue since 2026-08-09 (#880, `edfringe.com`, filed
  2026-08-11), still owner-filed — the zero-external-reports finding holds at
  14/14. Checked what it actually was before folding it into the count: unlike
  the twelve prior site-specific requests, `edinburghfringe.js` already existed
  (since the 2026-06-22 restructure), and the closing PR (#881) added a second
  test case rather than new site support — so it's excluded from the
  local/civic-skew tally but kept as a new finding in its own right (the
  channel doubles as a "harden this extractor" form, not only a "this site
  doesn't work" one). No open question answered or opened.
