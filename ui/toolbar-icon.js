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
// The registry + source list this worker loads is GENERATED into
// pipeline/worker-imports.generated.js by `npm run index` (an MV3 worker can
// only importScripts synchronously at startup, so it can't read
// load-order.generated.json first). Importing the generated file keeps the
// worker's list a single source of truth with the sources on disk — adding a
// source touches no file here, and there's no hand-list to conflict on. A drift
// guard (test/unit/load-order-generated.test.js) fails if it goes stale.
//
// Leading-slash (extension-root) path: an MV3 service worker resolves an
// importScripts path relative to the worker's OWN location, which is ui/ — but
// the pipeline files live at the extension root, so the path needs the leading
// slash to point there. Without it the import resolves to ui/pipeline/… , fails
// to load, and that first failure aborts the whole worker before the listeners
// below register — leaving the toolbar with no availability signal at all.
// See #146. (The generated file's own imports are leading-slash absolute too.)
importScripts("/pipeline/worker-imports.generated.js");

// Fetch the fallback allow/denylists from the JSON (single source of truth shared
// with config.js). The fetch is async; every event handler awaits `ready` so
// isDeniedHost() always sees the populated list, even on a cold worker start.
// On fetch failure the lists stay empty and the gray icon simply won't appear.
const ready = fetch(chrome.runtime.getURL("pipeline/fallback-lists.json"))
  .then((r) => r.json())
  .then((data) => {
    GCal.sourceFallbackDenylist  = data.denylist  || [];
    GCal.sourceFallbackAllowlist = data.allowlist || [];
  })
  .catch(() => {});

// Availability is shown by swapping the toolbar icon between three tile variants:
//   green — site has a first-class extractor (GCal.isSupportedHost)
//   gray  — site is on the fallback denylist (GCal.isDeniedHost)
//   blue  — default, page not classified
// Using the icon color rather than a badge avoids the badge pill overlapping the
// glyph, and makes the signal visible even when the icon is small.
//
// The icon paths MUST be extension-root absolute (chrome.runtime.getURL), not the
// bare "icons/..." relative form. This worker lives at ui/toolbar-icon.js, so
// chrome.action.setIcon resolves a relative path against ui/ and then fails to
// fetch ui/icons/... — setIcon rejects with "Failed to set icon: Failed to
// fetch" and the icon never changes (the #204 symptom). It's the same
// extension-root-vs-worker-dir trap as the importScripts leading slashes above
// (#146); getURL makes the extension-root resolution explicit.
const iconVariant = (suffix) => ({
  16:  chrome.runtime.getURL(`icons/icon16${suffix}.png`),
  32:  chrome.runtime.getURL(`icons/icon32${suffix}.png`),
  48:  chrome.runtime.getURL(`icons/icon48${suffix}.png`),
  128: chrome.runtime.getURL(`icons/icon128${suffix}.png`),
});
const BLUE_ICON  = iconVariant("");
const GREEN_ICON = iconVariant("-supported");
const GRAY_ICON  = iconVariant("-denied");

// The { size -> packaged icon URL } map for a given page URL.
function availabilityIcon(url) {
  if (GCal.isSupportedHost(url)) return GREEN_ICON;
  if (GCal.isDeniedHost(url))    return GRAY_ICON;
  return BLUE_ICON;
}

async function updateIcon(tabId, url) {
  try {
    await chrome.action.setIcon({ tabId, path: availabilityIcon(url) });
  } catch (e) {
    // Tab may have closed before this ran.
  }
}

// Each listener is async and awaits its Chrome API calls so Chrome keeps the
// service worker alive until the icon swap completes (MV3 service workers are
// only kept alive for the duration of a returned Promise, not a callback).
// `await ready` ensures the denylist is loaded before isDeniedHost() is consulted.
chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  await ready;
  const tab = await chrome.tabs.get(tabId).catch(() => null);
  if (tab?.url) await updateIcon(tabId, tab.url);
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.url || changeInfo.status === "complete") {
    await ready;
    await updateIcon(tabId, tab.url);
  }
});

async function updateAllTabIcons() {
  await ready;
  for (const tab of await chrome.tabs.query({})) {
    await updateIcon(tab.id, tab.url);
  }
}

chrome.runtime.onInstalled.addListener(updateAllTabIcons);
chrome.runtime.onStartup.addListener(updateAllTabIcons);
