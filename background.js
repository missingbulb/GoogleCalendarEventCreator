// New-source request (popup, unsupported pages).
//
// Loaded by the popup as a classic script. The Google Calendar URL-building
// half of this file moved to pipeline/build-calendar-url.js; only the
// source-request flow remains here (it moves to ui/views/ in a later phase).
//
// On a non-compatible site (red toolbar border) where no event is found, the
// popup offers a button that opens a prefilled GitHub "New issue" page for
// requesting that the page's site be added as a supported source. It targets
// the "New event source request" issue form (.github/ISSUE_TEMPLATE/
// new-source-request.yml): a logged-in GitHub user lands on that structured
// form with the fields already filled in, reviews them, and clicks "Submit new
// issue" — no token, form service, or backend involved. GitHub forbids framing
// its pages (X-Frame-Options), so this opens in a new tab rather than being
// embedded, matching how the extension opens the Google Calendar template.
const SOURCE_REQUEST_REPO = "missingbulb/GoogleCalendarEventCreator";
const SOURCE_REQUEST_TEMPLATE = "new-source-request.yml";
const SOURCE_REQUEST_LABEL = "new-source";

// The prefill keys, which double as the issue form's field ids (the `id:` of
// each field in the template) — GitHub prefills a form field from the query
// param matching its id.
const SOURCE_REQUEST_FIELDS = ["url", "name", "start", "end", "timezone", "location", "description"];

// Build the GitHub issue-form URL for a source request, prefilled from the
// current page's details (`prefill` keyed by SOURCE_REQUEST_FIELDS). The title
// carries the page URL; each non-empty field seeds the matching form field
// (empty ones are left for the user to complete). The `new-source` label is
// applied by both the template and this param.
function buildSourceRequestUrl(prefill) {
  const params = new URLSearchParams({
    template: SOURCE_REQUEST_TEMPLATE,
    title: `New event source request - ${prefill.url}`,
    labels: SOURCE_REQUEST_LABEL,
  });
  for (const id of SOURCE_REQUEST_FIELDS) {
    if (prefill[id]) params.set(id, prefill[id]);
  }
  return `https://github.com/${SOURCE_REQUEST_REPO}/issues/new?${params.toString()}`;
}
