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

// --- New-source request form (popup, unsupported pages) --------------------
// On a non-compatible site (red toolbar border) where no event is found, the
// popup embeds this Google Form so the user can request that the page's site
// be added as a supported source. The form's own onFormSubmit Apps Script
// trigger is what files the GitHub issue ("New event source request - <URL>");
// the extension only embeds a copy prefilled with the current page's details.
//
// TO ENABLE: create the Google Form, then set `baseUrl` to its "viewform" URL
// and map each field below to that question's prefill entry id — read the
// `entry.NNN` names off the form's "Get pre-filled link". Leave `baseUrl`
// empty (as shipped) and the popup keeps its plain "No events found" fallback.
const SOURCE_REQUEST_FORM = {
  baseUrl: "", // e.g. "https://docs.google.com/forms/d/e/<FORM_ID>/viewform"
  entries: {
    url: "", // e.g. "entry.111111111"
    name: "",
    start: "",
    end: "",
    timezone: "",
    location: "",
    description: "",
  },
};

// Build the embedded Google Form URL, prefilled with the current page's event
// details (`prefill` keyed by the field names in SOURCE_REQUEST_FORM.entries).
// Empty fields are left out rather than sent blank. Returns "" when the form
// hasn't been configured yet (no baseUrl), so the caller falls back to the
// plain empty state instead of embedding a broken iframe.
function buildSourceRequestUrl(prefill) {
  if (!SOURCE_REQUEST_FORM.baseUrl) return "";
  const params = new URLSearchParams({ embedded: "true" });
  for (const [field, entryId] of Object.entries(SOURCE_REQUEST_FORM.entries)) {
    const value = prefill[field];
    if (entryId && value) params.set(entryId, value);
  }
  return `${SOURCE_REQUEST_FORM.baseUrl}?${params.toString()}`;
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
