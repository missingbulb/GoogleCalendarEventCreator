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
  "/pipeline/sources/eventim-co-il.js",
  "/pipeline/sources/facebook.js",
  "/pipeline/sources/luma.js",
  "/pipeline/sources/meetup.js",
  "/pipeline/sources/telavivcinematheque.js",
  "/pipeline/sources/thinkdrink.js",
  "/pipeline/sources/ticketmaster.js"
);

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
// Each variant is a { size -> packaged PNG path } map, but we must NOT hand those
// paths to chrome.action.setIcon: setIcon({ path }) is a silent no-op in an MV3
// service worker — the worker has no document to decode the referenced file, so
// the icon simply never changes (Chromium #1262029 / docs issue #2165). This was
// the real cause of #204; making the listeners async fixed the worker's lifetime
// but not this. The worker has to decode each PNG to ImageData itself
// (toImageData below) and pass `imageData` instead.
const BLUE_ICON  = { 16: "icons/icon16.png",           32: "icons/icon32.png",           48: "icons/icon48.png",           128: "icons/icon128.png"           };
const GREEN_ICON = { 16: "icons/icon16-supported.png", 32: "icons/icon32-supported.png", 48: "icons/icon48-supported.png", 128: "icons/icon128-supported.png" };
const GRAY_ICON  = { 16: "icons/icon16-denied.png",    32: "icons/icon32-denied.png",    48: "icons/icon48-denied.png",    128: "icons/icon128-denied.png"    };

// The { size -> PNG path } map for a given page URL.
function availabilityIcon(url) {
  if (GCal.isSupportedHost(url)) return GREEN_ICON;
  if (GCal.isDeniedHost(url))    return GRAY_ICON;
  return BLUE_ICON;
}

// Decode one packaged PNG into ImageData. A service worker has no Image element
// or document, so the only way to rasterize a PNG is fetch -> Blob ->
// createImageBitmap -> draw onto an OffscreenCanvas -> getImageData.
async function decodeIcon(path) {
  const blob = await (await fetch(chrome.runtime.getURL(path))).blob();
  const bitmap = await createImageBitmap(blob);
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(bitmap, 0, 0);
  return ctx.getImageData(0, 0, bitmap.width, bitmap.height);
}

// Decode a whole { size -> path } variant into the { size -> ImageData } map
// chrome.action.setIcon wants. Cached per variant (the maps are stable module
// constants) so switching tabs reuses the decode instead of refetching four
// PNGs; a failed decode is evicted so a later update can retry.
const iconImageData = new Map();
function toImageData(paths) {
  if (!iconImageData.has(paths)) {
    const decoded = (async () => {
      const sizes = await Promise.all(
        Object.entries(paths).map(async ([size, path]) => [size, await decodeIcon(path)])
      );
      return Object.fromEntries(sizes);
    })();
    decoded.catch(() => iconImageData.delete(paths));
    iconImageData.set(paths, decoded);
  }
  return iconImageData.get(paths);
}

async function updateIcon(tabId, url) {
  let imageData;
  try {
    imageData = await toImageData(availabilityIcon(url));
  } catch (e) {
    // A failed icon decode is the real problem (#204), not a benign race — make
    // it visible in the service worker console instead of silently swallowing it.
    console.warn("toolbar-icon: could not decode the toolbar icon", e);
    return; // leave the manifest's default icon in place
  }
  try {
    await chrome.action.setIcon({ tabId, imageData });
  } catch (e) {
    // Tab likely closed between picking the icon and applying it — benign.
  }
}

// Each listener is async and awaits its Chrome API calls so Chrome keeps the
// service worker alive until the icon swap completes (MV3 service workers are
// only kept alive for the duration of a returned Promise, not a callback).
// `await ready` at the top of each handler ensures the fallback lists are
// loaded before isDeniedHost() is consulted.
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
