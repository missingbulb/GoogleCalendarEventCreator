// Shared hostname-matching registry for the site-specific extractors.
//
// This file is intentionally DOM-free so it can be used in two places:
//   - as a content script, listed in EXTRACTOR_FILES right after lib.js, where
//     each extractors/<site>.js reuses the relevant entry's `matches` function
//   - via importScripts() from the background service worker, which uses it to
//     decide whether the toolbar icon should show as "supported" (green
//     border) or "unsupported" (red border) for the active tab's hostname
//
// Must run after lib.js: lib.js assigns a fresh object to globalThis.GCal, so
// loading this first would have its `siteHosts` property wiped out.
globalThis.GCal = globalThis.GCal || {};
GCal.siteHosts = [
  { name: "meetup", matches: (host) => /(^|\.)meetup\.com$/.test(host) },
  { name: "facebook", matches: (host) => /(^|\.)facebook\.com$/.test(host) },
  { name: "eventbrite", matches: (host) => /(^|\.)eventbrite\./.test(host) },
  { name: "edinburghfringe", matches: (host) => /(^|\.)edfringe\.com$/.test(host) },
];
