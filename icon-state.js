// Background service worker: keeps the toolbar icon's border color in sync
// with whether the active tab's page has a site-specific extractor.
//
// This is separate from background.js (the popup's shared library) because
// popup.html loads background.js directly as a <script>, where APIs like
// importScripts() and chrome.tabs.onActivated aren't meaningful — this file
// is the manifest's "background.service_worker" instead.

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

// The toolbar icon's border color for a given page URL: green when a
// site-specific extractor exists for it, red otherwise.
function iconBorderColor(url) {
  return isSupportedUrl(url) ? "green" : "red";
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
