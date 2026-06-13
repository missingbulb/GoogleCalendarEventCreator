# Security Review

Refs #35

This is a review of the extension's attack surface, trust boundaries, and
known risks as of the current `main`. It covers the runtime extension code
(`manifest.json`, `background.js`, `icon-state.js`, `popup.html`/`popup.js`,
`extractors/`) and, briefly, the repository's dev/CI tooling.

## 1. Summary

The extension's overall security posture is good, but it is broader than a
quick glance at `README.md`'s "Permissions" section suggests:

- **Manifest V3**, with `activeTab`, `scripting`, and **`tabs`** permissions.
  `tabs` is new relative to the original `activeTab`+`scripting`-only design
  and is discussed in [3.1](#31-tabs-permission--persistent-background-service-worker-icon-statejs-low--documented).
  `README.md` already documents this permission and what it's used for.
- The **page-content extraction** path (the part that runs untrusted,
  attacker-influenced DOM/JSON from the current page) now runs whenever the
  **popup is opened**, not only when the user clicks "Add to Google
  Calendar" ([3.2](#32-popup-runs-the-extractor-on-every-open-not-only-on-create-informational)).
- The extension still **sends nothing over the network**. Its only outputs
  are (a) the toolbar icon's color, computed from a hostname regex match, and
  (b) a `https://calendar.google.com/calendar/render?...` URL opened in a new
  tab when the user explicitly clicks the popup's button.
- No `eval`, `new Function`, remote script loading, or other dynamic-code
  execution anywhere in the codebase.

## 2. Trust boundary / data flow

There are now two independent flows:

```
A) Toolbar icon coloring (always running, no user gesture required)
   icon-state.js (the manifest's background.service_worker)
     -> chrome.tabs.onActivated / onUpdated / onInstalled / onStartup
     -> reads tab.url for every tab (requires the "tabs" permission)
     -> extractors/site-hosts.js: hostname regex match only
     -> chrome.action.setIcon(...)   (green/red border, no page content read)

B) Event extraction (only while the popup is open, a user-initiated action)
   User opens the popup
     -> popup.js: chrome.scripting.executeScript(EXTRACTOR_FILES) on the active tab
     -> extractors/*.js (DOM queries, JSON-LD / __NEXT_DATA__ JSON parsing,
        regex date parsing) over the page's live DOM (untrusted)
     -> background.js: buildCalendarUrl()
     -> shown in the popup; only on button click:
          chrome.tabs.create({ url: "https://calendar.google.com/calendar/render?..." })
```

Flow (A) is the main change since the last review: it runs continuously in
the background and inspects the **URL** (not content) of every open tab.
Flow (B) is the original extraction pipeline, now triggered by opening the
popup rather than by a single toolbar click, and extended with two new
site-specific extractors (`cinema.js`, `edinburghfringe.js`) and a `ctz`
(calendar timezone) field.

The only "privileged" sinks are `chrome.action.setIcon` (flow A, takes a
fixed set of bundled icon paths — no attacker-controlled input reaches it)
and `chrome.tabs.create` (flow B, target constrained to a hardcoded
origin/path with all dynamic values passed through `URLSearchParams`, which
percent-encodes them).

## 3. Findings

### 3.1 `tabs` permission + persistent background service worker (`icon-state.js`) (Low — documented)

`manifest.json` now requests `"permissions": ["activeTab", "scripting",
"tabs"]`, and `icon-state.js` is registered as the persistent
`background.service_worker`. It listens to `chrome.tabs.onActivated`,
`chrome.tabs.onUpdated`, `chrome.runtime.onInstalled`, and
`chrome.runtime.onStartup`, and on every event calls `chrome.tabs.get`/iterates
`chrome.tabs.query({})` to read `tab.url` for **every open tab**, then checks
it against the hostname regexes in `extractors/site-hosts.js` to choose a
green/red toolbar icon.

This is a meaningful change from the original `activeTab`-only model:

- Without `tabs`, the extension could only see a tab's URL after the user
  invoked it on that specific tab (`activeTab`).
- With `tabs`, `icon-state.js` runs unconditionally for the lifetime of the
  browser session and can observe the **hostname/URL of every tab the user
  has open**, including tabs the user never interacts with the extension on.

In the current code this is used for nothing more than a hostname regex
match (`GCal.siteHosts`) to pick a bundled icon — **no page content is read,
nothing leaves the device, and nothing is persisted**. So the practical risk
today is low, and `README.md`'s "Permissions" section already documents the
`tabs` permission and this exact hostname-only usage.

Any future change to `icon-state.js` that does more than a hostname check
(e.g. fetching something based on `tab.url`, or recording visited hosts)
would meaningfully change the privacy story and should get its own review and
README update.

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
author (`"Asia/Tel_Aviv"` in `cinema.js`, `"GB"` in `edinburghfringe.js`) —
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

### 3.8 Dev/CI tooling — snapshot refresher fetches URLs from case files (Low, dev-only)

`test/integration/refresh-snapshots.js` fetches the `url` field from each
JSON file in `test/integration/cases/` and writes the response to disk, then
the daily `.github/workflows/refresh-snapshots.yml` workflow commits the
result with `contents: write`. This is standard SSRF-shaped behavior (fetch a
URL, persist the body) but:

- the URL list is fixed, reviewed, repo-controlled content (not user input),
- the workflow runs on a schedule / manual dispatch only (not on
  `pull_request`), so a PR can't smuggle in a new fetch target and have it run
  with write access in the same step a stranger controls.

No change recommended; noted for completeness since it's the one place CI
fetches arbitrary network content with a token that can push to the repo. The
new `test/ui/` snapshot tooling (`refresh-icon-snapshot.js`,
`refresh-snapshot.js`) follows the same local-render/no-network pattern as
the rest of the test suite and doesn't add new fetch targets.

### 3.9 Permissions & supply chain (Informational)

- `manifest.json` requests `activeTab`, `scripting`, and `tabs` (see 3.1).
  No `host_permissions`, no `content_scripts`, no `storage`, no remote code.
- The only dependency (`jsdom`) is a `devDependency` used solely by the test
  suite; it is not bundled into the extension that users install. Test/UI
  tooling also bundles Liberation Sans font files under
  `test/ui/fonts/` (with their `LICENSE`), used only for rendering snapshots
  in tests — not shipped with the extension.
- Manifest V3's default Content Security Policy (no remote script execution)
  applies and the extension doesn't declare a custom, looser one.

## 4. Recommendations summary

| # | Finding | Severity | Suggested action |
|---|---------|----------|-------------------|
| 3.1 | `tabs` permission + always-on `icon-state.js` reads every tab's URL | Low | No action — already documented in `README.md`; re-review if `icon-state.js` ever does more than a hostname check |
| 3.2 | Popup runs the extractor on every open | Informational | No action — same trust boundary, just triggered earlier |
| 3.3 | `innerHTML` used to strip HTML from untrusted JSON-LD `description` | Medium | Replace with `DOMParser`-based stripping |
| 3.4 | Regex/JSON parsing over untrusted page content | Low | Keep new patterns simple; avoid nested unbounded quantifiers; consider a ReDoS check in CI |
| 3.5 | `ctz` passed through to Calendar URL | Informational | If ever derived from page content, validate against IANA tz list |
| 3.6 | Calendar URL construction incl. `sourceLink` | Informational | No action — `URLSearchParams` + fixed origin already mitigate this |
| 3.7 | `meta()` template-literal selector | Informational | No action — only called with literals |
| 3.8 | Snapshot refresher fetches case URLs in CI | Low | No action — scheduled/manual only, URLs are repo-reviewed |
| 3.9 | Permissions & supply chain | Informational | No action — minimal permissions beyond `tabs`, no remote code, dev-only dependencies |

## 5. Out of scope

This review covers the code as committed. It does not cover the Chrome Web
Store listing/publishing process, the user's own Google account/session
(the extension relies on the user already being signed into Google Calendar
in their browser), or the security of the third-party sites the extractors
target.
