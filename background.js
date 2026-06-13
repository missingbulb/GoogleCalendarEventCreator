// Shared library, loaded by the popup: builds a pre-filled Google Calendar
// event template URL from extracted page data.

// Injected in order into the page when the popup opens; all files share one
// isolated world, so lib.js must come first and main.js (whose completion
// value is the extraction result) must come last. The test harness reads
// this list, so tests always exercise exactly what gets injected.
const EXTRACTOR_FILES = [
  "extractors/lib.js",
  "extractors/site-hosts.js",
  "extractors/jsonld.js",
  "extractors/generic.js",
  "extractors/meetup.js",
  "extractors/luma.js",
  "extractors/facebook.js",
  "extractors/eventbrite.js",
  "extractors/telavivcinematheque.js",
  "extractors/edinburghfringe.js",
  "extractors/main.js",
];

const CALENDAR_RENDER_URL = "https://calendar.google.com/calendar/render";
const DEFAULT_DURATION_MS = 2 * 60 * 60 * 1000; // 2 hours when no end time given
const MAX_DETAILS_LENGTH = 1500; // keep the template URL a reasonable size

function buildCalendarUrl(data, tab) {
  const params = new URLSearchParams();
  params.set("action", "TEMPLATE");

  const title = data.title || tab.title || "New event";
  params.set("text", title);

  const dates = formatDatesParam(data.start, data.end);
  if (dates) params.set("dates", dates);
  if (data.ctz) params.set("ctz", data.ctz);

  // The details field always starts with a link back to the original event
  // page, followed by the extracted description.
  let details = (data.description || "").slice(0, MAX_DETAILS_LENGTH);
  details = linkifyMarkdown(details);
  const link = sourceLink(tab);
  details = (link ? link + "\n\n" : "") + details;
  params.set("details", details.trim());

  if (data.location) params.set("location", data.location);

  return `${CALENDAR_RENDER_URL}?${params.toString()}`;
}

// The link placed at the top of the details field for a given tab. Google
// Calendar autolinks a bare URL in the details field, so it's emitted as plain
// text. On meetup.com, event URLs often carry tracking query parameters
// (recId, recSource, searchId, ...); strip them entirely so the link points at
// the clean canonical URL, e.g.
//   https://www.meetup.com/group/events/123
function sourceLink(tab) {
  if (!tab.url) return "";
  let url;
  try {
    url = new URL(tab.url);
  } catch (e) {
    return tab.url;
  }
  const host = url.hostname.replace(/^www\./, "");
  if (/(^|\.)meetup\.com$/.test(host)) {
    return `${url.origin}${url.pathname.replace(/\/+$/, "")}`;
  }
  return tab.url;
}

// Markdown links survive extraction (e.g. Meetup's JSON-LD description, which
// jsonld.js runs through stripHtml() — that drops HTML tags but leaves markdown
// intact). Google Calendar renders the details field as HTML, not markdown, so
// turn [text](url) into an <a> anchor; the URL is kept as-is. An incomplete
// link left dangling by the MAX_DETAILS_LENGTH slice (a `[text]` with no
// following `(url)`) doesn't match and stays literal.
function linkifyMarkdown(text) {
  return text.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>');
}

// Build the `dates` parameter for the TEMPLATE URL:
//   timed:   YYYYMMDDTHHMMSS/YYYYMMDDTHHMMSS  (floating, placed by ctz or the
//            user's calendar tz)
//            or with trailing Z when the source gave an absolute instant
//   all-day: YYYYMMDD/YYYYMMDD               (end date exclusive)
//
// Extractors that know the event's timezone already hand us floating local
// times (see GCal.localizeToZone), so a known-timezone event reaches here as a
// floating start/end and its ctz param places it. An offset/Z that survives to
// here is an event with no known timezone, and is pinned to a UTC instant.
function formatDatesParam(start, end) {
  if (!start) return "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(start)) {
    const endDay = /^\d{4}-\d{2}-\d{2}$/.test(end || "") ? end : start;
    return `${compactDay(start)}/${compactDay(nextDay(endDay))}`;
  }

  const hasOffset = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(start);
  const startDate = new Date(start);
  if (isNaN(startDate)) return "";

  let endDate = end ? new Date(end) : null;
  if (!endDate || isNaN(endDate) || endDate <= startDate) {
    endDate = new Date(startDate.getTime() + DEFAULT_DURATION_MS);
  }

  return hasOffset
    ? `${compactUTC(startDate)}/${compactUTC(endDate)}`
    : `${compactLocal(startDate)}/${compactLocal(endDate)}`;
}

// --- New-source request (popup, unsupported pages) -------------------------
// On a non-compatible site (red toolbar border) where no event is found, the
// popup offers a button that opens a prefilled GitHub "New issue" page for
// requesting that the page's site be added as a supported source. A logged-in
// GitHub user just reviews the prefilled title/body and clicks "Submit new
// issue" — no token, form service, or backend involved. GitHub forbids framing
// its pages (X-Frame-Options), so this opens in a new tab rather than being
// embedded, matching how the extension opens the Google Calendar template.
const SOURCE_REQUEST_REPO = "missingbulb/GoogleCalendarEventCreator";

// The event fields, in the order they appear in the prefilled issue body.
const SOURCE_REQUEST_FIELDS = [
  ["URL", "url"],
  ["Name", "name"],
  ["Start time", "start"],
  ["End time", "end"],
  ["Timezone", "timezone"],
  ["Location", "location"],
  ["Description", "description"],
];

// Build the GitHub "new issue" URL for a source request, with the title and
// body prefilled from the current page's details (`prefill` keyed by the field
// names in SOURCE_REQUEST_FIELDS). The body asks for the site to be added and
// lists the page's values so a reviewer can turn them into an integration
// test; unknown fields are marked rather than dropped, since the user can edit
// the issue before submitting.
function buildSourceRequestUrl(prefill) {
  const title = `New event source request - ${prefill.url}`;
  const values = SOURCE_REQUEST_FIELDS.map(
    ([label, field]) => `- ${label}: ${prefill[field] || "(unknown — please fill in)"}`
  ).join("\n");
  const body =
    `Please add this as a new source: ${prefill.url}\n\n` +
    "After getting the HTML cached, write an integration test that asserts the " +
    `following values:\n\n${values}`;
  const params = new URLSearchParams({ title, body });
  return `https://github.com/${SOURCE_REQUEST_REPO}/issues/new?${params.toString()}`;
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function compactDay(isoDay) {
  return isoDay.replace(/-/g, "");
}

function nextDay(isoDay) {
  const [y, m, d] = isoDay.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  return `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}`;
}

function compactUTC(d) {
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

function compactLocal(d) {
  return (
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}` +
    `T${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  );
}
