// Background service worker: keeps the toolbar icon's border color in sync
// with whether the active tab's page has a site-specific extractor.
//
// The single supported-host decision is GCal.isSupportedHost (pipeline/
// registry.js), which derives "supported" from the registered sources' own
// `matches` functions. The worker loads the registry and every source so the
// registry is populated, then colors the toolbar icon green (a source matches
// this page) vs. red (none does). DOM-free files only — the sources register
// their matchers at load and the worker never calls extract().
//
// This list is checked against pipeline/load-order.generated.json by
// test/unit/load-order-generated.test.js: an MV3 service worker can only
// importScripts synchronously at startup (it can't read the generated JSON
// first), so the list is explicit here, and that test fails if a source is
// added without updating it.
importScripts(
  "pipeline/registry.js",
  "pipeline/sources/edinburghfringe.js",
  "pipeline/sources/eventbrite.js",
  "pipeline/sources/facebook.js",
  "pipeline/sources/luma.js",
  "pipeline/sources/meetup.js",
  "pipeline/sources/telavivcinematheque.js",
  "pipeline/sources/ticketmaster.js"
);

const ICON_SIZES = [16, 32, 48, 128];
const SUPPORTED_ICON = Object.fromEntries(ICON_SIZES.map((s) => [s, `icons/icon${s}-green.png`]));
const UNSUPPORTED_ICON = Object.fromEntries(ICON_SIZES.map((s) => [s, `icons/icon${s}-red.png`]));

// The toolbar icon's border color for a given page URL: green when a
// site-specific extractor exists for it, red otherwise.
function iconBorderColor(url) {
  return GCal.isSupportedHost(url) ? "green" : "red";
}

async function updateIcon(tabId, url) {
  const path = GCal.isSupportedHost(url) ? SUPPORTED_ICON : UNSUPPORTED_ICON;
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
