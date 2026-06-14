// Source-request view: shown on an unsupported page (red toolbar border) where
// no source matched. Offers a button that opens a prefilled GitHub "New issue"
// page requesting that the page's site be added as a supported source.
//
// An ES module, loaded on demand by the popup controller (popup.js) via dynamic
// import() when the page is on an unsupported host. `makeSourceRequestButton`
// is the controller's entry point; `buildSourceRequestUrl` is also exported for
// the unit tests. This is the source-request half of the former background.js.
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
