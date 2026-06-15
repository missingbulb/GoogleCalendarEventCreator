// The "what to do on an unsupported page" view: two affordances the popup
// controller (popup.js) renders for a host with no per-site source.
//
//   makeSourceRequestButton — shown when the generic fallback DID find an event
//     on an unknown host (State 4): a button that opens a prefilled GitHub "New
//     issue" page requesting the site be added as a supported source, seeded
//     with the scraped event.
//   makePolicyLink — shown when there's no event to offer (State 2/3b): a quiet
//     link to the public "how this extension finds events" doc, rather than
//     pestering for support on a page that has no event.
//
// An ES module, loaded on demand by popup.js via dynamic import(). The two
// `make*` functions are the controller's entry points; `buildSourceRequestUrl`
// and `buildPolicyDocUrl` are also exported for the unit tests. This is the
// source-request half of the former background.js.
//
// The button targets the "Event source request" issue form (.github/
// ISSUE_TEMPLATE/extractor-request.yml): a logged-in GitHub user lands on that
// structured form with the fields already filled in, reviews them, and clicks
// "Submit new issue" — no token, form service, or backend involved. GitHub
// forbids framing its pages (X-Frame-Options), so this opens in a new tab
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

// Build the GitHub issue-form URL for a source request, prefilled from the
// current page's details (`prefill` keyed by SOURCE_REQUEST_FIELDS). The title
// carries the page URL; each non-empty field seeds the matching form field
// (empty ones are left for the user to complete). The `extractor-request` label
// is applied by both the template and this param.
export function buildSourceRequestUrl(prefill) {
  const params = new URLSearchParams({
    template: SOURCE_REQUEST_TEMPLATE,
    title: `Event source request - ${prefill.url}`,
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

// On an unsupported page with no event found, a button that opens a prefilled
// GitHub "new issue" page (in a new tab) requesting this site be added as a
// source. Styled like the event buttons for consistency, but with a GitHub
// mark instead of a date chip. A logged-in GitHub user just submits the
// already-filled issue.
export function makeSourceRequestButton(tab, event) {
  const url = buildSourceRequestUrl(sourceRequestPrefill(tab, event));

  const btn = document.createElement("button");
  btn.className = "event-btn";

  const body = document.createElement("span");
  body.className = "e-body";

  const title = document.createElement("span");
  title.className = "e-title";
  title.textContent = "Request support for this site";
  body.appendChild(title);

  const sub = document.createElement("span");
  sub.className = "e-when";
  sub.textContent = "Opens a prefilled GitHub issue";
  body.appendChild(sub);

  btn.appendChild(body);

  btn.addEventListener("click", async () => {
    await chrome.tabs.create({ url, index: tab.index + 1 });
    window.close();
  });
  return btn;
}

// On an unsupported page with no event to offer, a quiet "Disagree?" link that
// opens the public "how this extension finds events" doc in a new tab. Far
// lighter than the request button: we don't ask anyone to sponsor a site that
// has no event — we just point to how the call was made.
export function makePolicyLink(tab) {
  const url = buildPolicyDocUrl();

  const link = document.createElement("a");
  link.className = "policy-link";
  link.textContent = "Disagree?";
  link.href = url;
  link.addEventListener("click", async (e) => {
    e.preventDefault();
    await chrome.tabs.create({ url, index: tab.index + 1 });
    window.close();
  });
  return link;
}

// The fields that seed the source-request form: the page URL and title, plus
// any event details extraction managed to find. On an unsupported page that's
// often just the URL and title (no event was parsed), so the user completes
// the rest in the form itself.
function sourceRequestPrefill(tab, event) {
  event = event || {};
  return {
    url: tab.url || "",
    name: event.title || tab.title || "",
    start: event.start || "",
    end: event.end || "",
    timezone: event.ctz || "",
    location: event.location || "",
    description: event.description || "",
  };
}
