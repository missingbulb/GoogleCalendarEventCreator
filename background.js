// Service worker: on toolbar click, run the extractor in the active tab and
// open a pre-filled Google Calendar event template with whatever was found.

// Injected in order into the page on click; all files share one isolated
// world, so lib.js must come first and main.js (whose completion value is
// the extraction result) must come last. The test harness reads this list,
// so tests always exercise exactly what gets injected.
const EXTRACTOR_FILES = [
  "extractors/lib.js",
  "extractors/jsonld.js",
  "extractors/generic.js",
  "extractors/meetup.js",
  "extractors/facebook.js",
  "extractors/eventbrite.js",
  "extractors/main.js",
];

const CALENDAR_RENDER_URL = "https://calendar.google.com/calendar/render";
const DEFAULT_DURATION_MS = 2 * 60 * 60 * 1000; // 2 hours when no end time given
const MAX_DETAILS_LENGTH = 1500; // keep the template URL a reasonable size

chrome.action.onClicked.addListener(async (tab) => {
  let data = {};
  try {
    const [injection] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: EXTRACTOR_FILES,
    });
    data = (injection && injection.result) || {};
  } catch (e) {
    // Restricted page (chrome://, Web Store, etc.) — fall back to tab metadata.
    console.warn("Could not extract from page:", e);
  }

  const url = buildCalendarUrl(data, tab);
  await chrome.tabs.create({ url, index: tab.index + 1 });
});

function buildCalendarUrl(data, tab) {
  const params = new URLSearchParams();
  params.set("action", "TEMPLATE");

  const title = data.title || tab.title || "New event";
  params.set("text", title);

  const { dates, ctz } = formatDatesParam(data.start, data.end);
  if (dates) params.set("dates", dates);
  if (ctz) params.set("ctz", ctz);

  // The details field always starts with the original event page URL,
  // followed by the extracted description.
  let details = (data.description || "").slice(0, MAX_DETAILS_LENGTH);
  if (data.multipleEvents) {
    details = "(First of several events found on this page.)\n\n" + details;
  }
  details = (tab.url ? tab.url + "\n\n" : "") + details;
  params.set("details", details.trim());

  if (data.location) params.set("location", data.location);

  return `${CALENDAR_RENDER_URL}?${params.toString()}`;
}

// Build the `dates` (and, when applicable, `ctz`) parameters for the
// TEMPLATE URL:
//   timed:   YYYYMMDDTHHMMSS/YYYYMMDDTHHMMSS  (floating, user's calendar tz)
//            or the same shape plus a `ctz` param when the source specified
//            an explicit offset, so the event keeps the page's wall-clock
//            time regardless of the viewer's timezone
//   all-day: YYYYMMDD/YYYYMMDD               (end date exclusive)
// Returns {} when no usable date was found.
function formatDatesParam(start, end) {
  if (!start) return {};

  if (/^\d{4}-\d{2}-\d{2}$/.test(start)) {
    const endDay = /^\d{4}-\d{2}-\d{2}$/.test(end || "") ? end : start;
    return { dates: `${compactDay(start)}/${compactDay(nextDay(endDay))}` };
  }

  const offsetMatch = start.match(/(Z|[+-]\d{2}:?\d{2})$/i);
  const startDate = new Date(start);
  if (isNaN(startDate)) return {};

  let endDate = end ? new Date(end) : null;
  if (!endDate || isNaN(endDate) || endDate <= startDate) {
    endDate = new Date(startDate.getTime() + DEFAULT_DURATION_MS);
  }

  if (!offsetMatch) {
    return { dates: `${compactLocal(startDate)}/${compactLocal(endDate)}` };
  }

  const offsetMinutes = parseOffsetMinutes(offsetMatch[0]);
  const ctz = offsetToCtz(offsetMinutes);
  if (ctz === null) {
    // Etc/GMT zones only cover whole-hour offsets; fall back to an exact
    // UTC instant for the rare fractional-hour case.
    return { dates: `${compactUTC(startDate)}/${compactUTC(endDate)}` };
  }

  return {
    dates:
      `${compactDateTime(shiftByMinutes(startDate, offsetMinutes))}` +
      `/${compactDateTime(shiftByMinutes(endDate, offsetMinutes))}`,
    ctz,
  };
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

// Parses a trailing ISO 8601 offset ("Z" or "+HH:MM"/"-HHMM") into minutes
// east of UTC.
function parseOffsetMinutes(offset) {
  if (/^Z$/i.test(offset)) return 0;
  const [, sign, hh, mm] = offset.match(/^([+-])(\d{2}):?(\d{2})$/);
  return (sign === "-" ? -1 : 1) * (Number(hh) * 60 + Number(mm));
}

// Maps a whole-hour UTC offset to the corresponding Etc/GMT timezone, whose
// sign convention is the POSIX one: Etc/GMT+N is N hours WEST of UTC, i.e.
// the opposite sign of an ISO 8601 offset. Returns null for fractional-hour
// offsets (e.g. +05:30), which Etc/GMT cannot represent.
function offsetToCtz(offsetMinutes) {
  if (offsetMinutes === 0) return "UTC";
  if (offsetMinutes % 60 !== 0) return null;
  const hours = offsetMinutes / 60;
  return `Etc/GMT${hours > 0 ? "-" : "+"}${Math.abs(hours)}`;
}

function shiftByMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60_000);
}

function compactDateTime(d) {
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}`
  );
}

function compactUTC(d) {
  return `${compactDateTime(d)}Z`;
}

function compactLocal(d) {
  return (
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}` +
    `T${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  );
}
