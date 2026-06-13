// Service worker: on toolbar click, run the extractor in the active tab and
// open a pre-filled Google Calendar event template with whatever was found.

// Injected in order into the page on click; all files share one isolated
// world, so lib.js must come first and main.js (whose completion value is
// the extraction result) must come last. The test harness reads this list,
// so tests always exercise exactly what gets injected.
const EXTRACTOR_FILES = [
  "extractors/lib.js",
  "extractors/site-hosts.js",
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

// Reuse the same hostname matchers as the site-specific extractors (via
// GCal.siteHosts) to decide whether the toolbar icon shows green (a
// site-specific extractor exists for this page) or red (it doesn't).
importScripts("extractors/site-hosts.js");

const ICON_SIZES = [16, 32, 48, 128];
const SUPPORTED_ICON = Object.fromEntries(ICON_SIZES.map((s) => [s, `icons/icon${s}-green.png`]));
const UNSUPPORTED_ICON = Object.fromEntries(ICON_SIZES.map((s) => [s, `icons/icon${s}-red.png`]));

function isSupportedUrl(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return GCal.siteHosts.some((site) => site.matches(host));
  } catch (e) {
    return false; // no URL yet (new tab) or a non-http(s) URL (chrome://, etc.)
  }
}

async function updateIcon(tabId, url) {
  const path = isSupportedUrl(url) ? SUPPORTED_ICON : UNSUPPORTED_ICON;
  try {
    await chrome.action.setIcon({ tabId, path });
  } catch (e) {
    // Tab may have closed before this ran.
  }
}

chrome.tabs.onActivated.addListener(({ tabId }) => {
  chrome.tabs.get(tabId, (tab) => {
    if (tab) updateIcon(tabId, tab.url);
  });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url || changeInfo.status === "complete") {
    updateIcon(tabId, tab.url);
  }
});

async function updateAllTabIcons() {
  for (const tab of await chrome.tabs.query({})) {
    updateIcon(tab.id, tab.url);
  }
}

chrome.runtime.onInstalled.addListener(updateAllTabIcons);
chrome.runtime.onStartup.addListener(updateAllTabIcons);

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

  const dates = formatDatesParam(data.start, data.end);
  if (dates) params.set("dates", dates);

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

// Build the `dates` parameter for the TEMPLATE URL:
//   timed:   YYYYMMDDTHHMMSS/YYYYMMDDTHHMMSS  (floating, user's calendar tz)
//            or with trailing Z when the source specified an absolute instant
//   all-day: YYYYMMDD/YYYYMMDD               (end date exclusive)
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
