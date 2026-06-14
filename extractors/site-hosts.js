// Shared hostname-matching registry for the site-specific extractors.
//
// This file is intentionally DOM-free so it can be used in two places:
//   - as a content script, injected right after lib.js (per the generated
//     pipeline/load-order.generated.json), where each extractors/<site>.js
//     reuses the relevant entry's `matches` function
//   - via importScripts() from the background service worker, which uses it to
//     decide whether the toolbar icon should show as "supported" (green
//     border) or "unsupported" (red border) for the active tab's hostname
//
// Must run after lib.js: lib.js assigns a fresh object to globalThis.GCal, so
// loading this first would have its `siteHosts` property wiped out.
globalThis.GCal = globalThis.GCal || {};
GCal.siteHosts = [
  { name: "meetup", matches: (host) => /(^|\.)meetup\.com$/.test(host) },
  { name: "luma", matches: (host) => /(^|\.)(luma\.com|lu\.ma)$/.test(host) },
  { name: "facebook", matches: (host) => /(^|\.)facebook\.com$/.test(host) },
  { name: "eventbrite", matches: (host) => /(^|\.)eventbrite\./.test(host) },
  { name: "edinburghfringe", matches: (host) => /(^|\.)edfringe\.com$/.test(host) },
  { name: "telavivcinematheque", matches: (host) => /(^|\.)cinema\.co\.il$/.test(host) },
  { name: "ticketmaster", matches: (host) => /(^|\.)ticketmaster\.co\.il$/.test(host) },
];

// THE single source of truth for "is this page a supported site": its hostname
// has a registered site-specific extractor above. Both consumers derive from
// this one function so they can never disagree — the toolbar icon's border
// color (icon-state.js) and what the popup shows (popup.js). A page on an
// unregistered host gets a red border AND the popup's "request this source"
// flow, never an event button, even if the generic/JSON-LD layers happened to
// scrape something off it. DOM-free like the rest of this file, so it runs the
// same in the service worker, the popup, and content-script contexts.
GCal.isSupportedHost = function (url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return GCal.siteHosts.some((site) => site.matches(host));
  } catch (e) {
    return false; // no URL yet (new tab) or a non-http(s) URL (chrome://, etc.)
  }
};
