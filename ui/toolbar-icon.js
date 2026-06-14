// Background service worker: shows a small green badge on the toolbar icon for
// pages that have a site-specific extractor, and no badge anywhere else.
//
// The single supported-host decision is GCal.isSupportedHost (pipeline/
// registry.js), which derives "supported" from the registered sources' own
// `matches` functions. The worker loads the registry and every source so the
// registry is populated, then shows a green badge when a source matches this
// page (and clears the badge when none does). DOM-free files only — the sources
// register their matchers at load and the worker never calls extract().
//
// This list is checked against pipeline/load-order.generated.json by
// test/unit/load-order-generated.test.js: an MV3 service worker can only
// importScripts synchronously at startup (it can't read the generated JSON
// first), so the list is explicit here, and that test fails if a source is
// added without updating it.
//
// Leading-slash (extension-root) paths: an MV3 service worker resolves an
// importScripts path relative to the worker's OWN location, which is ui/ — but
// the pipeline files live at the extension root, so each path needs the leading
// slash to point there. Without it the import resolves to ui/pipeline/… , fails
// to load, and that first failure aborts the whole worker before the listeners
// below register — leaving the toolbar with no availability badge at all.
// See #146.
importScripts(
  "/pipeline/registry.js",
  "/pipeline/sources/edinburghfringe.js",
  "/pipeline/sources/eventbrite.js",
  "/pipeline/sources/facebook.js",
  "/pipeline/sources/luma.js",
  "/pipeline/sources/meetup.js",
  "/pipeline/sources/telavivcinematheque.js",
  "/pipeline/sources/ticketmaster.js"
);

// Availability is shown by the toolbar badge's background color: a green pill
// (Google green, matching the icon's "+") on supported pages, and nothing
// elsewhere. Chrome only paints the badge when its text is non-empty, so a
// single space gives a text-free colored pill; an empty string clears it.
const GREEN = "#34a853";
const SUPPORTED_BADGE = { color: GREEN, text: " " };
const NO_BADGE = { color: GREEN, text: "" };

// The toolbar badge for a given page URL: a green pill when a site-specific
// extractor exists for it, no badge otherwise.
function availabilityBadge(url) {
  return GCal.isSupportedHost(url) ? SUPPORTED_BADGE : NO_BADGE;
}

async function updateBadge(tabId, url) {
  const { color, text } = availabilityBadge(url);
  try {
    await chrome.action.setBadgeBackgroundColor({ tabId, color });
    await chrome.action.setBadgeText({ tabId, text });
  } catch (e) {
    // Tab may have closed before this ran.
  }
}

chrome.tabs.onActivated.addListener(({ tabId }) => {
  chrome.tabs.get(tabId, (tab) => {
    if (tab) updateBadge(tabId, tab.url);
  });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url || changeInfo.status === "complete") {
    updateBadge(tabId, tab.url);
  }
});

async function updateAllTabBadges() {
  for (const tab of await chrome.tabs.query({})) {
    updateBadge(tab.id, tab.url);
  }
}

chrome.runtime.onInstalled.addListener(updateAllTabBadges);
chrome.runtime.onStartup.addListener(updateAllTabBadges);
