// The two heading-line affordances the popup controller (popup.js) renders for a
// host with no per-site source — both small, right-aligned links that sit on the
// popup's heading line:
//
//   makeSourceRequestLink — shown when the generic fallback found a complete
//     event on an unlisted host (State 5): a "Suggest Correction" link that opens
//     a prefilled GitHub "Event source request" issue, seeded with the scraped
//     event.
//   makePolicyLink — shown when there's nothing to show on a non-denylisted host
//     (State 3): a "Disagree?" link to the public "how this extension finds
//     events" doc.
//
// An ES module, loaded on demand by popup.js via dynamic import(). The two
// `make*` functions are the controller's entry points; `buildSourceRequestUrl`
// and `buildPolicyDocUrl` are also exported for the unit tests. This is the
// source-request half of the former background.js.
//
// The "Suggest Correction" link targets the "Event source request" issue form
// (.github/ISSUE_TEMPLATE/extractor-request.yml): a logged-in GitHub user lands
// on that structured form with the fields already filled in, reviews them, and
// clicks "Submit new issue" — no token, form service, or backend involved.
// GitHub forbids framing its pages (X-Frame-Options), so this opens in a new tab
// rather than being embedded, matching how the extension opens the Calendar
// template.
//
// The form applies the `extractor-request` label, which kicks off the
// auto-implement-extractor workflow — so a submitted request flows straight into
// the agent that writes the extractor and opens a PR.
const SOURCE_REQUEST_REPO = "missingbulb/GoogleCalendarEventCreator";
const SOURCE_REQUEST_TEMPLATE = "extractor-request.yml";
const SOURCE_REQUEST_LABEL = "extractor-request";

// The public doc the "Disagree?" link opens — a short, user-facing explanation
// of how the extension decides what's an event. Path is relative to the repo
// root on the default branch; an existence test (test/unit/source-request.test.js)
// fails if the file is moved without updating this, so the link can't rot.
const POLICY_DOC_PATH = "docs/extraction-policy.md";

// The prefill keys, which double as the issue form's field ids (the `id:` of
// each field in the template) — GitHub prefills a form field from the query
// param matching its id.
const SOURCE_REQUEST_FIELDS = ["url", "name", "start", "end", "timezone", "location", "description"];

// Generic registry labels that, sitting directly under a two-letter
// country-code TLD, form a compound public suffix: `co.uk`, `com.au`, `gov.il`,
// `co.jp`, `ac.uk`, … Keying on this small generic set plus *any* 2-letter
// ccTLD keeps the apex extraction country-independent — there's no per-country
// list to maintain (the gap that let `gov.il` slip through, #313). Correctly
// resolving every compound suffix needs the full Public Suffix List, which is
// far too heavy to bundle for a cosmetic issue title; this rule covers the
// overwhelmingly common shape without it.
const REGISTRY_SLDS = new Set([
  "co", "com", "net", "org", "gov", "gob", "edu", "ac", "mil", "sch",
]);

// The registrable "apex" domain of a URL for display in the issue title:
// hostname with the protocol/path/query and any subdomains stripped down to the
// registrable domain (`https://dash.datadoghq.com/?utm=...` -> `datadoghq.com`,
// `https://visit.tel-aviv.gov.il/...` -> `tel-aviv.gov.il`). Falls back to the
// raw value when it can't parse a host (so a malformed URL still produces a
// title).
function apexDomain(url) {
  let host;
  try {
    host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch (e) {
    return url || "";
  }
  const labels = host.split(".");
  // An IP address or a bare single-label host has no apex to strip to.
  if (labels.length <= 2 || /^\d+$/.test(labels[labels.length - 1])) return host;
  // A compound public suffix (co.uk, com.au, gov.il, …): a generic registry
  // label under a two-letter country-code TLD. Keep three labels; else two.
  const tld = labels[labels.length - 1];
  const sld = labels[labels.length - 2];
  const take = tld.length === 2 && REGISTRY_SLDS.has(sld) ? 3 : 2;
  return labels.slice(-take).join(".");
}

// Build the GitHub issue-form URL for a source request, prefilled from the
// current page's details (`prefill` keyed by SOURCE_REQUEST_FIELDS). The title
// carries the page's apex domain (not the noisy full URL — the URL itself
// seeds the `url` field); each non-empty field seeds the matching form field
// (empty ones are left for the user to complete). The `extractor-request` label
// is applied by both the template and this param.
export function buildSourceRequestUrl(prefill) {
  const params = new URLSearchParams({
    template: SOURCE_REQUEST_TEMPLATE,
    title: `Event source request - ${apexDomain(prefill.url)}`,
    labels: SOURCE_REQUEST_LABEL,
  });
  for (const id of SOURCE_REQUEST_FIELDS) {
    if (prefill[id]) params.set(id, prefill[id]);
  }
  return `https://github.com/${SOURCE_REQUEST_REPO}/issues/new?${params.toString()}`;
}

// The URL the "Disagree?" link opens: the policy doc rendered on the repo's
// default branch. Built from the same repo constant as the issue form, so the
// slug stays single-sourced.
export function buildPolicyDocUrl() {
  return `https://github.com/${SOURCE_REQUEST_REPO}/blob/main/${POLICY_DOC_PATH}`;
}

// A small link that sits on the popup's heading line (right-aligned via
// #heading.with-link) and opens `url` in a new tab. The shared shape behind both
// affordances below.
function headingLink(text, url, tab) {
  const link = document.createElement("a");
  link.className = "heading-link";
  link.textContent = text;
  link.href = url;
  link.addEventListener("click", async (e) => {
    e.preventDefault();
    await chrome.tabs.create({ url, index: tab.index + 1 });
    window.close();
  });
  return link;
}

// State 5: a complete fallback event on an unlisted host. A "Suggest Correction"
// link that opens the prefilled GitHub "Event source request" issue, seeded with
// the scraped event — a logged-in user just submits the already-filled form.
export function makeSourceRequestLink(tab, event) {
  return headingLink("Suggest Correction", buildSourceRequestUrl(sourceRequestPrefill(tab, event)), tab);
}

// State 3: nothing to show on a non-denylisted host. A quiet "Disagree?" link to
// the public "how this extension finds events" doc.
export function makePolicyLink(tab) {
  return headingLink("Disagree?", buildPolicyDocUrl(), tab);
}

// The fields that seed the source-request form: the page URL and title, plus
// any event details extraction managed to find. On an unsupported page that's
// often just the URL and title (no event was parsed), so the user completes
// the rest in the form itself.
//
// Exported for the unit tests (the make* link builders that call it touch
// chrome.tabs/document, so the tests exercise the prefill directly).
export function sourceRequestPrefill(tab, event) {
  event = event || {};
  // The event carries its timing in times[] (the multi-instance model); seed the
  // form from the first instance. A flat { start, end } event is tolerated too.
  const instance = (event.times && event.times[0]) || event;
  return {
    url: tab.url || "",
    name: event.title || tab.title || "",
    start: instance.start || "",
    end: instance.end || "",
    // When the fallback couldn't read a timezone off the page, default to the
    // user's current zone — a sensible guess they can correct in the form
    // (the event page they're on is usually in their own zone), better than blank.
    timezone: event.ctz || currentTimezone(),
    location: event.location || "",
    description: event.description || "",
  };
}

// The user's current IANA timezone (e.g. "America/New_York"), or "" if the
// runtime can't resolve one.
function currentTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  } catch (e) {
    return "";
  }
}
