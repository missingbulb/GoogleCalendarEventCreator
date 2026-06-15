// Background service worker: swaps the toolbar icon to a green tile on pages that
// have a site-specific extractor, and a blue tile everywhere else. No badge is
// used — the tile color itself is the state signal.
//
// The single supported-host decision is GCal.isSupportedHost (pipeline/
// registry.js), which derives "supported" from the registered sources' own
// `matches` functions. The worker loads the registry and every source so the
// registry is populated, then swaps the icon when a source matches this page.
// DOM-free files only — the sources register their matchers at load and the
// worker never calls extract().
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
// below register — leaving the toolbar with no availability signal at all.
// See #146.
importScripts(
  "/pipeline/registry.js",
  "/pipeline/sources/bandsintown.js",
  "/pipeline/sources/edinburghfringe.js",
  "/pipeline/sources/eventbrite.js",
  "/pipeline/sources/facebook.js",
  "/pipeline/sources/luma.js",
  "/pipeline/sources/meetup.js",
  "/pipeline/sources/telavivcinematheque.js",
  "/pipeline/sources/thinkdrink.js",
  "/pipeline/sources/ticketmaster.js"
);

// Availability is shown by swapping the toolbar icon between two tile variants:
// a blue tile (default, page not supported) and a green tile (page supported).
// Using the icon color rather than a badge avoids the badge pill overlapping the
// glyph, and makes the signal visible even when the icon is small.
const BLUE_ICON = { 16: "icons/icon16.png", 32: "icons/icon32.png", 48: "icons/icon48.png", 128: "icons/icon128.png" };
const GREEN_ICON = { 16: "icons/icon16-supported.png", 32: "icons/icon32-supported.png", 48: "icons/icon48-supported.png", 128: "icons/icon128-supported.png" };

// The toolbar icon for a given page URL: green tile when a site-specific
// extractor exists for it, blue tile otherwise.
function availabilityIcon(url) {
  return GCal.isSupportedHost(url) ? GREEN_ICON : BLUE_ICON;
}

async function updateIcon(tabId, url) {
  try {
    await chrome.action.setIcon({ tabId, path: availabilityIcon(url) });
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
