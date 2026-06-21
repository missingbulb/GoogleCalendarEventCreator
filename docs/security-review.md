# Security Review

Refs #35

This is a review of the extension's attack surface, trust boundaries, and
known risks as of the current `main`. It covers the runtime extension code
(`manifest.json`, the `ui/` popup + service worker, and the `pipeline/`
extraction files) and, briefly, the repository's dev/CI tooling.

## 1. Summary

The extension's overall security posture is good, but it is broader than a
quick glance at `../README.md`'s "Permissions" section suggests:

- **Manifest V3**, with `activeTab`, `scripting`, and **`declarativeContent`**
  permissions. The earlier `tabs` permission (which read every tab's URL to
  color the toolbar icon, and triggered Chrome's "Read your browsing history"
  install warning) has been **removed**: the icon is now colored by
  `declarativeContent` rules the browser matches itself, so the extension never
  reads any tab's URL — see
  [3.1](#31-declarativecontent-icon-coloring-no-tab-url-access-low). This is a
  net reduction in attack surface versus the prior `tabs`-based design.
- The **page-content extraction** path (the part that runs untrusted,
  attacker-influenced DOM/JSON from the current page) now runs whenever the
  **popup is opened**, not only when the user clicks "Add to Google
  Calendar" ([3.2](#32-popup-runs-the-extractor-on-every-open-not-only-on-create-informational)).
- The extension still **sends nothing over the network**. Its only outputs
  are (a) the toolbar's availability badge, computed from a hostname regex match, and
  (b) a `https://calendar.google.com/calendar/render?...` URL opened in a new
  tab when the user explicitly clicks the popup's button.
- No `eval`, `new Function`, remote script loading, or other dynamic-code
  execution anywhere in the codebase.
- Separately from code-level sinks, [section 4](#4-threat-model-malicious-web-pages-targeting-event-creation)
  looks at what a **malicious page** can achieve by shaping its own
  markup/metadata — since the extractors are designed to trust page content,
  a page can put arbitrary attacker-chosen text (including phishing links)
  into the proposed event's title/description/location.

## 2. Trust boundary / data flow

There are now two independent flows:

```
A) Toolbar icon coloring (declarative; the browser matches, the extension never
   reads any tab URL)
   ui/toolbar-icon.js (the manifest's background.service_worker)
     -> on runtime.onInstalled / onStartup, registers chrome.declarativeContent
        rules from pipeline/fallback-lists.json (supported/denied host patterns)
     -> the BROWSER matches a tab's URL against those patterns and swaps the
        action icon (green/red/blue) — no tab.url is ever read by extension code
        (no "tabs" permission)

B) Event extraction (only while the popup is open, a user-initiated action)
   User opens the popup
     -> popup.js: chrome.scripting.executeScript on the active tab, injecting the
        files listed in pipeline/load-order.generated.json
     -> pipeline/* extraction files (DOM queries, JSON-LD / __NEXT_DATA__ JSON
        parsing, regex date parsing) over the page's live DOM (untrusted)
     -> pipeline/build-calendar-url.js: buildCalendarUrl()
     -> shown in the popup; only on button click:
          chrome.tabs.create({ url: "https://calendar.google.com/calendar/render?..." })
```

Flow (A) no longer reads any tab's URL: the extension hands the browser a set
of host-pattern rules once, and the browser does all matching internally. This
is a reduction from the prior `tabs`-based design, which read `tab.url` for
every open tab. Flow (B) is the original extraction pipeline, triggered by
opening the popup rather than by a single toolbar click, and extended with two
new site-specific extractors (`telavivcinematheque.js`, `edinburghfringe.js`)
and a `ctz` (calendar timezone) field.

The only "privileged" sinks are `chrome.declarativeContent.SetIcon` (flow A, a
fixed set of packaged icons — no attacker-controlled input reaches it) and
`chrome.tabs.create` (flow B, target constrained to a hardcoded origin/path with
all dynamic values passed through `URLSearchParams`, which percent-encodes them).

## 3. Findings

### 3.1 `declarativeContent` icon coloring (no tab-URL access) (Low)

`manifest.json` requests `"permissions": ["activeTab", "scripting",
"declarativeContent"]`. The background service worker (`ui/toolbar-icon.js`)
registers `chrome.declarativeContent.onPageChanged` rules at
`runtime.onInstalled`/`onStartup`, built from the supported/denied host patterns
in `pipeline/fallback-lists.json`. The **browser** evaluates those rules against
each page's URL and swaps the toolbar icon; the extension's own code never reads
`tab.url`.

This is a security improvement over the previous `tabs`-based design:

- The old worker read `tab.url` for **every open tab** (the `tabs` permission),
  which Chrome surfaces to users as the **"Read your browsing history"** install
  warning.
- `declarativeContent` keeps the same per-host icon behavior but moves the URL
  matching into the browser, so the extension observes no tab URLs at all — and
  the scary install prompt is gone.

The rules contain only static, repo-controlled host patterns and packaged
icons — **no page content is read, nothing leaves the device, and nothing is
persisted**. `../README.md`'s and `../PRIVACY.md`'s "Permissions" sections
document this usage.

Any future change that reverts to reading `tab.url` (e.g. re-adding `tabs` or
broad host permissions) would re-introduce the browsing-history exposure and
should get its own review and README/PRIVACY update.

No action required.

### 3.2 Popup runs the extractor on every open, not only on "Create" (Informational)

Previously, page extraction (`chrome.scripting.executeScript` with
`EXTRACTOR_FILES`) ran only inside the toolbar `onClicked` handler, i.e. once
per explicit "create event" action. Now `popup.js` runs the same injection
**every time the popup is opened**, to populate the preview (title/when/
location) before the user decides whether to click "Add to Google Calendar".

This doesn't change the permission model — opening the action's popup is
itself the qualifying user gesture for `activeTab`, so the extension is still
only ever injected into the page the user is actively interacting with, and
still only in response to a deliberate click on the toolbar icon. But it does
mean the extractor code (DOM queries, JSON-LD/`__NEXT_DATA__` JSON parsing,
regex date scans — see 3.3/3.4 below) now runs on **every popup open**,
including cases where the user opens the popup just to look and then closes
it without creating an event. Any bug in the extractors (e.g. an infinite
loop or pathological regex) would now manifest on popup open rather than only
on "create click".

No action required; noted because it slightly widens *when* untrusted-page
parsing code executes, even though it doesn't widen *what* it can access.

### 3.3 `innerHTML` used to strip HTML from JSON-LD `description` (Medium)

`extractors/jsonld.js`:

```js
function stripHtml(s) {
  if (!s) return "";
  const div = document.createElement("div");
  div.innerHTML = s;
  return clean(div.textContent);
}
```

`s` is the `description` field of a `schema.org/Event` JSON-LD block, which
is fully attacker-controlled (any page can embed arbitrary JSON-LD). Setting
`.innerHTML` parses the string as HTML and creates live DOM nodes — even
though the `<div>` is never attached to the document, HTML parsing itself can
trigger side effects in some engines (e.g. image fetches / `onerror` handlers
on `<img>` tags), which is a textbook DOM-XSS sink pattern. The result is
also truncated to plain text and only ever placed into a URL query parameter
afterwards (see 3.6), so the realistic blast radius is limited (no
re-rendering as HTML), but the sink itself is unnecessary and avoidable.

**Recommendation:** parse with `DOMParser` instead, which produces an inert
document with no associated browsing context (scripts don't run, resources
aren't fetched, event handler attributes aren't realized):

```js
function stripHtml(s) {
  if (!s) return "";
  return clean(new DOMParser().parseFromString(s, "text/html").body.textContent);
}
```

### 3.4 Regex-based date/JSON parsing runs on attacker-controlled page content (Low)

`extractors/lib.js` (`parseDateFromText`) and `extractors/facebook.js` run a
series of regular expressions — several with adjacent optional groups and
alternations — against up to 8000/4000 characters of page text. The new
`extractors/edinburghfringe.js` additionally does `JSON.parse()` on the
contents of a `<script id="__NEXT_DATA__">` element, which is also fully
page-controlled; this is wrapped in `try/catch` and only navigates a plain
object afterwards, so it's safe (`JSON.parse` doesn't execute code).

None of the current regex patterns contain the classic nested-quantifier
shapes that cause catastrophic backtracking (e.g. `(a+)+`), and they're
bounded to a few KB of input, so this remains low risk. As before, any future
pattern additions (or new `__NEXT_DATA__`/JSON-LD style extractors) should be
checked for backtracking blowups or unbounded recursive structures, since a
pathological input could now hang the **popup's** script (per 3.2) on every
open, not just on click.

### 3.5 New `ctz` field passed through to the Calendar URL (Informational)

`background.js` now does `if (data.ctz) params.set("ctz", data.ctz)`. In all
current extractors, `ctz` is a **hardcoded constant** chosen by the extractor
author (`"Asia/Tel_Aviv"` in `telavivcinematheque.js`, `"GB"` in `edinburghfringe.js`) —
never derived from page content — so there's no injection concern today.
`URLSearchParams.set` would percent-encode it regardless.

**Recommendation:** if a future extractor ever derives `ctz` from page
content (e.g. scraping a timezone name), validate it against the IANA
timezone list (as the project's own commit history already does for a
related case) before passing it through, to avoid passing arbitrary strings
to Google Calendar even though `URLSearchParams` already prevents URL
structure injection.

### 3.6 Calendar URL construction (`background.js`) (Informational — looks safe)

`buildCalendarUrl()` builds the destination URL with a hardcoded
scheme/host/path (`https://calendar.google.com/calendar/render`) and sets all
attacker-influenced fields (`title`, `location`, `description`, `ctz`,
`sourceLink(tab)`) via `URLSearchParams.set(...)`, which percent-encodes
values. A malicious page cannot use these fields to change the destination
origin, inject additional query parameters, or switch to a
`javascript:`/`data:` URL. The `details` field is also length-capped
(`MAX_DETAILS_LENGTH = 1500`).

The new `sourceLink(tab)` helper special-cases `meetup.com` URLs to show a
"canonical" link text while keeping the original (tracking-parameter-laden)
URL as the link target, e.g. `[https://.../events/123](https://.../events/123/?recId=...)`.
Both strings come from `tab.url` (the page the user is already on) and are
placed in the `details` query parameter as plain text — Google Calendar's
"create" screen does not render arbitrary Markdown/HTML from this field as
live links with attacker-chosen targets beyond what `tab.url` already is, so
this doesn't introduce a new sink.

No action needed.

### 3.7 `meta()` selector built with template literals (Informational — not exploitable)

`extractors/lib.js`:

```js
function meta(nameOrProp) {
  const el = document.querySelector(
    `meta[property="${nameOrProp}"], meta[name="${nameOrProp}"], meta[itemprop="${nameOrProp}"]`
  );
  ...
}
```

`nameOrProp` is always a hardcoded literal supplied by the extractors
(`"og:title"`, `"description"`, etc.), never page-derived data, so there's no
selector-injection concern in practice. Worth keeping in mind if `meta()` is
ever called with a dynamic value in the future.

### 3.8 Dev/CI tooling — cache refresher fetches URLs from case files (Low, dev-only)

`data/refresh-cache.js` fetches the `url` field from each
JSON file in `test/extractors/custom/` and writes the response to disk, then
the daily `.github/workflows/refresh-cache.yml` workflow commits the
result with `contents: write`. This is standard SSRF-shaped behavior (fetch a
URL, persist the body) but:

- the URL list is fixed, reviewed, repo-controlled content (not user input),
- the workflow runs on a schedule / manual dispatch only (not on
  `pull_request`), so a PR can't smuggle in a new fetch target and have it run
  with write access in the same step a stranger controls.

No change recommended; noted for completeness since it's the one place CI
fetches arbitrary network content with a token that can push to the repo. The
new `test/ui/` snapshot tooling (`refresh-popup-snapshots.js`) follows the same
local-render/no-network pattern as
the rest of the test suite and doesn't add new fetch targets.

### 3.9 Permissions & supply chain (Informational)

- `manifest.json` requests `activeTab`, `scripting`, and `declarativeContent`
  (see 3.1). No `tabs`, no `host_permissions`, no `content_scripts`, no
  `storage`, no remote code.
- The only dependency (`jsdom`) is a `devDependency` used solely by the test
  suite; it is not bundled into the extension that users install. Test/UI
  tooling also bundles Liberation Sans font files under
  `test/ui/fonts/` (with their `LICENSE`), used only for rendering snapshots
  in tests — not shipped with the extension.
- Manifest V3's default Content Security Policy (no remote script execution)
  applies and the extension doesn't declare a custom, looser one.

## 4. Threat model: malicious web pages targeting event creation

The findings in section 3 are mostly about the extension's *code* (DOM/URL
sinks). This section looks at the other side: what a **malicious page
author** can achieve simply by shaping the page's markup/metadata, given that
the extractors trust page content by design (that's their job) and feed it
into a calendar event the user is invited to save.

### 4.1 Full control over the prefilled event via the generic parser / JSON-LD (Informational — by design, but worth naming)

`extractors/generic.js` and `extractors/jsonld.js` are deliberately
permissive: they read `<meta>` tags, microdata, `<time datetime>`, and
`application/ld+json` blocks — all author-supplied metadata that doesn't have
to match what's visually rendered on the page. A page can therefore carry a
**hidden** `schema.org/Event` JSON-LD block (or `og:title`/`description` meta
tags) with attacker-chosen `name`, `description`, `location`, `startDate`,
etc., entirely independent of what the visible page says. The first time the
user learns the actual prefilled content is in the popup preview / Google
Calendar's create screen.

This is inherent to "read structured data from any page" and isn't a bug, but
it means: **the title/description/location/date the extension proposes are
not verified against what the user actually saw on the page**, and a page
built specifically to be fed to this extension can put arbitrary attacker
text into all of those fields.

### 4.2 Malicious links / phishing text via `description`, `location`, or `title` (Medium — social engineering)

`data.description` (sourced from `og:description`, JSON-LD `description`, or
`itemprop="description"`) is placed into the Calendar event's `details` field
essentially verbatim (HTML tags stripped, see 3.3, then truncated to 1500
chars). **Google Calendar's UI auto-linkifies bare URLs it finds in an
event's description.** So a malicious page can put text such as:

> "Meeting moved online — join here: https://evil-zoom-clone.example/j/123"

into its `og:description`, and after the user clicks through the popup and
saves the event, that becomes a **clickable link sitting in their calendar**
— to be clicked later, out of context, with the implicit trust people place
in their own calendar entries ("I created this, so it must be legitimate").
This is the same pattern as real-world "calendar invite phishing" campaigns.

`title` and `location` are equally unconstrained free-text from the page and
can carry the same kind of content (e.g. a title like `"Action required —
see description"`, or a `location` value containing a phone number / URL for
a vishing or phishing pretext). None of `title`, `location`, or `description`
are checked for being a plausible event field vs. an attacker-crafted message.

**Mitigating factors (already in place):**
- Nothing is created automatically. The extension opens Google Calendar's
  *editable* `action=TEMPLATE` create-event form; the user must review every
  field and click **Save**.
- The popup preview (title/when/location) gives the user a chance to notice
  something is off before even opening that tab.
- `details` always starts with the actual `tab.url` (or, for meetup, a
  canonical-vs-tracking link pair — see 3.6), so the *source* of the event is
  visible alongside any attacker text.

**Residual risk:** the mitigations rely on the user reading the prefilled
fields carefully — exactly the assumption phishing defenses generally can't
rely on, especially for the `description` field, which is the most likely
place for a long attacker-authored paragraph to be skimmed rather than read.

**Recommendation:**
- Add a short, persistent note in the popup UI (e.g. under the preview, or as
  a `title=` tooltip) along the lines of *"These details come from the page
  you're on — review them before saving."* This costs nothing and directly
  addresses the "looks official because I made it" trust transfer.
- Consider **not** auto-linkifying is out of the extension's control (that's
  Google Calendar's renderer), but the extension could avoid contributing to
  it — e.g. there's no need to change current behavior, just keep the
  description truncated (already done) and not add any extra unescaped URLs
  beyond `tab.url`/`sourceLink`.

### 4.3 "Multiple events" / decoy-event heuristic (Low)

`GCal.generic.detectMultiple()` plus "merge the first JSON-LD event" means
that on a page with several `schema.org/Event` blocks, the extractor uses
whichever one is **first in document order** — not necessarily the one most
prominent visually. A malicious listing page could place a decoy `Event`
JSON-LD object (with attacker-chosen title/description/link, per 4.1/4.2)
*before* the real, visually prominent event in the HTML, so the extension
prefills the decoy's data while the page visually shows something else. The
only signal to the user is the "(First of several events found on this
page.)" note prepended to `details` — easy to miss.

No code change is strictly required (this is a natural consequence of 4.1),
but it's worth being aware that the "first wins" heuristic is itself
attacker-influenceable on pages designed to exploit it.

### 4.4 Unicode/bidi/homoglyph spoofing in extracted text (Low)

None of `title`, `location`, or `description` are sanitized for bidirectional
override characters (`U+202A`–`U+202E`, `U+2066`–`U+2069`), zero-width
characters, or homoglyphs before being shown in the popup preview or placed
into the Calendar URL. A malicious page could use these to make extracted
text *display* differently than it reads byte-for-byte — e.g. disguising the
true destination of a URL embedded in `description`, or reordering text so a
malicious instruction reads as benign at a glance. This is a generic
web-content risk (any text from any page has this property), but it's
relevant here because the extension is the thing choosing to copy this text
into the user's calendar, where it may be read again later without the
original page's context.

**Recommendation:** consider stripping bidi control characters and zero-width
characters from extracted text in `GCal.clean()` (shared by all extractors),
as cheap defense-in-depth. Low priority.

### 4.5 No "spam"/auto-save vector; no Calendar API access (mitigating, by design)

Worth stating explicitly: the extension cannot be used to silently create,
modify, or delete calendar entries, nor to spam the user's calendar with
multiple events from one click. It:

- makes **no network requests of its own** and holds **no OAuth/Calendar API
  scope** — `calendar/render?action=TEMPLATE` is a plain Google-hosted web
  page the user's browser navigates to, pre-filled via URL query parameters;
- creates **at most one** new tab per click, and that tab only becomes a
  saved event if the signed-in user clicks **Save** on Google's own page;
- has no persistence (`storage` permission is not requested) and no way to
  re-trigger itself — every run starts from the current click/popup-open.

So while a malicious page can shape *what* gets proposed (4.1–4.4), it cannot
cause anything to be saved, repeated, or done without the user's explicit,
per-event action on Google's own UI.

### 4.6 Unbounded `title` / `location` length (Low)

`MAX_DETAILS_LENGTH = 1500` caps `description`, but `title` (`params.set("text",
title)`) and `location` (`params.set("location", data.location)`) are passed
through uncapped. A page could supply a very long `og:title`,
`itemprop="location"`, or venue-name string, producing a very long Calendar
URL and a visually overwhelming popup preview/title field. `URLSearchParams`
still percent-encodes safely and browsers/Google Calendar have their own URL
length limits, so this is a UX/robustness nit rather than a security hole.

**Recommendation:** apply a similar (generous) length cap to `title` and
`location` for consistency with `description`, e.g. a few hundred characters.

## 5. Recommendations summary

| # | Finding | Severity | Suggested action |
|---|---------|----------|-------------------|
| 3.1 | `declarativeContent` colors the icon with no tab-URL access (replaces the old `tabs`-based reader) | Low | No action — net reduction vs. `tabs`; re-review if the worker ever reverts to reading `tab.url` |
| 3.2 | Popup runs the extractor on every open | Informational | No action — same trust boundary, just triggered earlier |
| 3.3 | `innerHTML` used to strip HTML from untrusted JSON-LD `description` | Medium | Replace with `DOMParser`-based stripping |
| 3.4 | Regex/JSON parsing over untrusted page content | Low | Keep new patterns simple; avoid nested unbounded quantifiers; consider a ReDoS check in CI |
| 3.5 | `ctz` passed through to Calendar URL | Informational | If ever derived from page content, validate against IANA tz list |
| 3.6 | Calendar URL construction incl. `sourceLink` | Informational | No action — `URLSearchParams` + fixed origin already mitigate this |
| 3.7 | `meta()` template-literal selector | Informational | No action — only called with literals |
| 3.8 | Cache refresher fetches case URLs in CI | Low | No action — scheduled/manual only, URLs are repo-reviewed |
| 3.9 | Permissions & supply chain | Informational | No action — minimal permissions (no `tabs`/host permissions), no remote code, dev-only dependencies |
| 4.1 | Generic/JSON-LD parsing gives pages full control over prefilled event content, possibly hidden from view | Informational | By design; covered here for awareness |
| 4.2 | `description`/`title`/`location` can carry phishing text/links that Google Calendar auto-linkifies once saved | Medium | Add a "review before saving" note in the popup UI |
| 4.3 | "First event wins" heuristic is attacker-influenceable on multi-event pages | Low | No action — inherent to 4.1; "first of several" note already shown |
| 4.4 | No bidi/zero-width/homoglyph sanitization of extracted text | Low | Strip bidi control & zero-width chars in `GCal.clean()` |
| 4.5 | No auto-save / no Calendar API access | Informational | No action — confirms no spam/silent-write vector exists |
| 4.6 | `title`/`location` are uncapped in length | Low | Apply a generous length cap, matching `MAX_DETAILS_LENGTH` pattern |

## 6. Out of scope

This review covers the code as committed. It does not cover the Chrome Web
Store listing/publishing process, the user's own Google account/session
(the extension relies on the user already being signed into Google Calendar
in their browser), or the security of the third-party sites the extractors
target.
