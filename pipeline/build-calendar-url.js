// Builds a pre-filled Google Calendar event-template URL from an extracted
// event object — the page → events → calendar-URL pipeline's final step.
//
// Loaded by the popup as a classic script (popup.js calls buildCalendarUrl).
// This is the URL-building half of the former background.js; the source-request
// half still lives there for now.

const CALENDAR_RENDER_URL = "https://calendar.google.com/calendar/render";
const DEFAULT_DURATION_MS = 2 * 60 * 60 * 1000; // 2 hours when no end time given
const MAX_EVENT_CREATION_URL_LENGTH = 4000; // keep the whole template URL within a safe length

function buildCalendarUrl(data, tab) {
  const params = new URLSearchParams();
  params.set("action", "TEMPLATE");

  const title = data.title || tab.title || "New event";
  params.set("text", title);

  const dates = formatDatesParam(data.start, data.end);
  if (dates) params.set("dates", dates);
  if (data.ctz) params.set("ctz", data.ctz);
  if (data.location) params.set("location", data.location);

  // The details field always starts with a link back to the original event
  // page, followed by the full extracted description. It is added LAST so that
  // enforcing the overall URL-length cap below shortens the description rather
  // than truncating any of the other fields.
  let details = markdownToHtml(data.description || "");
  const link = sourceLink(tab);
  details = (link ? link + "\n\n" : "") + details;
  params.set("details", details.trim());

  return fitUrlToLimit(params);
}

// Build the template URL from `params` and, if it exceeds
// MAX_EVENT_CREATION_URL_LENGTH, shorten the trailing `details` value until the
// whole (URL-encoded) URL fits. details is the last param, so only it is
// trimmed; every other field is kept in full. Trimming works on the actual
// encoded URL length (not raw characters), so multi-byte/encoded text counts
// for what it really costs.
function fitUrlToLimit(params) {
  const urlFor = (details) => {
    params.set("details", details);
    return `${CALENDAR_RENDER_URL}?${params.toString()}`;
  };

  const details = params.get("details") || "";
  let url = urlFor(details);
  if (url.length <= MAX_EVENT_CREATION_URL_LENGTH) return url;

  // Longest prefix of details whose encoded URL fits the cap. Avoid ending on a
  // lone surrogate (a split emoji/code point), which would otherwise be encoded
  // as a replacement character.
  let lo = 0;
  let hi = details.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (urlFor(details.slice(0, mid)).length <= MAX_EVENT_CREATION_URL_LENGTH) lo = mid;
    else hi = mid - 1;
  }
  if (lo > 0 && lo < details.length) {
    const code = details.charCodeAt(lo - 1);
    if (code >= 0xd800 && code <= 0xdbff) lo -= 1; // don't keep a dangling high surrogate
  }

  if (lo === 0) {
    // Not even an empty details value leaves room under the cap; drop the field.
    params.delete("details");
    return `${CALENDAR_RENDER_URL}?${params.toString()}`;
  }
  return urlFor(details.slice(0, lo));
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

// Markdown survives extraction (e.g. Meetup's description, whose inline JSON
// state and JSON-LD both carry markdown). Google Calendar renders the details
// field as HTML, not markdown, so translate the markdown we see into HTML:
//   - links [text](url) -> <a href="url">text</a> (the URL is kept as-is; a
//     bare `[text]` with no following `(url)` doesn't match and stays literal)
//   - bold **text** -> <b>text</b>, but only when each `**` is an isolated
//     pair (not part of a longer run of asterisks) wrapping star-free,
//     single-line text. That keeps star ratings (e.g. edfringe reviews'
//     "***** (Scotsman)"), a stray/unmatched `**`, and `***bold-italic***`
//     literal rather than mangling them.
function markdownToHtml(text) {
  return text
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>')
    .replace(/(?<!\*)\*\*(?!\*)([^\n*]+?)\*\*(?!\*)/g, "<b>$1</b>");
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
