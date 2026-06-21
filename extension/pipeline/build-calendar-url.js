// Builds a pre-filled Google Calendar event-template URL from an extracted
// event object — the page → events → calendar-URL pipeline's final step.
//
// An ES module imported by ui/views/events-view.js (popup-document only, so it
// can be a module — it is never injected into the page). `buildCalendarUrl` and
// `formatDatesParam` are exported; the rest are module-private helpers.
//
// GOTCHAS — read before editing (file-local footguns; see dev/procedures/claude/workflow.md
// for why these live here and not in dev/procedures/technicalGotchas.md):
//   * Google Calendar renders the `details` param as HTML, not Markdown. A bare
//     `**bold**` shows literal asterisks; a bare URL is auto-linked (so it needs
//     no `<a>`). `markdownToHtml` below translates the Markdown that survives
//     extraction (Meetup / JSON-LD descriptions) into HTML for exactly this
//     reason. (#91, #102)
//   * Day-boundary date math must use UTC component math, never local-midnight +
//     `toISOString()`. `new Date("YYYY-MM-DDT00:00:00")` is *local* midnight,
//     which under a positive UTC offset is the previous UTC day, so
//     `toISOString()` reports the wrong adjacent date. `nextDay` below uses
//     `Date.UTC(y, m-1, d+1)` + `getUTC*` instead. The UTC/`C.UTF-8` sandbox/CI
//     default parses floating times as UTC, so a unit test there won't surface
//     the shift — it only shows in a positive-offset locale.

import { GCalConfig } from "../config.js";

const CALENDAR_RENDER_URL = "https://calendar.google.com/calendar/render";

// Build the Calendar template URL for one event INSTANCE. An event carries its
// timing in `times[]` (the multi-instance model); `instanceIndex` selects which
// showing to schedule — the only field that varies between an event's instances
// is the date/time, so title/location/description/ctz come from the event and
// only the `dates` param changes per instance. A flat event ({ start, end,
// eventLengthInMinutes } on the object itself) is still accepted — it's treated
// as its own single instance — so existing single-occurrence callers and tests
// need no change.
export function buildCalendarUrl(data, tab, instanceIndex = 0) {
  const instance = (data.times && data.times[instanceIndex]) || data;

  const params = new URLSearchParams();
  params.set("action", "TEMPLATE");

  const title = data.title || tab.title || GCalConfig.fallbackEventTitle;
  params.set("text", title);

  const dates = formatDatesParam(instance.start, instance.end, instance.eventLengthInMinutes);
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
// GCalConfig.maxEventUrlLength, shorten the trailing `details` value until the
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
  if (url.length <= GCalConfig.maxEventUrlLength) return url;

  // Longest prefix of details whose encoded URL fits the cap. Avoid ending on a
  // lone surrogate (a split emoji/code point), which would otherwise be encoded
  // as a replacement character.
  let lo = 0;
  let hi = details.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (urlFor(details.slice(0, mid)).length <= GCalConfig.maxEventUrlLength) lo = mid;
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
//   - links [text](url) -> <a href="url">text</a>, but only when `url` is a
//     safe scheme (http/https/mailto). The description is page-controlled, so a
//     `[x](javascript:...)` would otherwise emit `<a href="javascript:...">`
//     into Google Calendar's HTML-rendered details — don't build a dangerous
//     scheme from untrusted input; leave any other `[text](url)` literal. A bare
//     `[text]` with no following `(url)` doesn't match and stays literal too.
//   - bold **text** -> <b>text</b>, but only when each `**` is an isolated
//     pair (not part of a longer run of asterisks) wrapping star-free,
//     single-line text. That keeps star ratings (e.g. edfringe reviews'
//     "***** (Scotsman)"), a stray/unmatched `**`, and `***bold-italic***`
//     literal rather than mangling them.
function markdownToHtml(text) {
  return text
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (match, label, url) =>
      isSafeLinkUrl(url) ? `<a href="${url}">${label}</a>` : match
    )
    .replace(/(?<!\*)\*\*(?!\*)([^\n*]+?)\*\*(?!\*)/g, "<b>$1</b>");
}

// Whether a markdown link's URL is safe to emit as an <a href>. Allows only
// http/https/mailto and scheme-relative (//host) / relative URLs; rejects
// javascript:, data:, vbscript:, and any other scheme. A bare host like
// "example.com/x" has no scheme and is treated as relative (kept) — matching how
// Google Calendar would render it; the guard exists to block dangerous schemes,
// not to validate link reachability.
function isSafeLinkUrl(url) {
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(url);
  if (!scheme) return true; // no scheme -> relative/scheme-relative, safe
  return ["http", "https", "mailto"].includes(scheme[1].toLowerCase());
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
//
// When `eventLengthInMinutes` is supplied it is preferred over
// `defaultEventDurationMs` when the end is missing or invalid, and it can also
// derive a missing start from a known end (timed events only — it is ignored
// for all-day events where a minute duration has no meaning).
export function formatDatesParam(start, end, eventLengthInMinutes) {
  if (!start && !end) return "";

  if (start && /^\d{4}-\d{2}-\d{2}$/.test(start)) {
    // All-day event: eventLengthInMinutes doesn't apply to date-only values.
    const endDay = /^\d{4}-\d{2}-\d{2}$/.test(end || "") ? end : start;
    return `${compactDay(start)}/${compactDay(nextDay(endDay))}`;
  }

  // Determine offset presence from whichever bound we have.
  const hasOffset = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(start || end || "");
  let startDate = start ? new Date(start) : null;
  let endDate = end ? new Date(end) : null;

  // Derive a missing start from end + length (timed events only).
  if ((!startDate || isNaN(startDate)) && endDate && !isNaN(endDate) && eventLengthInMinutes) {
    startDate = new Date(endDate.getTime() - eventLengthInMinutes * 60000);
  }

  if (!startDate || isNaN(startDate)) return "";

  if (!endDate || isNaN(endDate) || endDate <= startDate) {
    const durationMs = eventLengthInMinutes != null
      ? eventLengthInMinutes * 60000
      : GCalConfig.defaultEventDurationMs;
    endDate = new Date(startDate.getTime() + durationMs);
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
