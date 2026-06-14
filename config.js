// config.js — single source of truth for the extension's tunable product
// decisions. Each value here is a deliberate product choice: change it to
// change behavior, and a diff to this file is a diff of product decisions
// (not something buried in a refactor).
//
// An ES module imported by the popup-document scripts that need these values
// (pipeline/build-calendar-url.js, ui/popup.js, ui/views/events-view.js) and,
// in Node, by the tests via dynamic import(). It is never injected into pages
// — the extractors don't read product config — so it stays a plain module
// rather than the GCal-global classic scripts the page injection uses.
export const GCalConfig = {
  // Event length when a page gives a start time but no end. Timed events only;
  // all-day events stay all-day. Applied only at Calendar-URL build time.
  defaultEventDurationMs: 2 * 60 * 60 * 1000,

  // Most events the popup lists from one page; beyond this it shows
  // "Showing first N of M".
  maxEventsShown: 7,

  // Hard cap on the whole Google Calendar template URL; only the trailing
  // details field is trimmed to fit (never the other fields).
  maxEventUrlLength: 6000,

  // Title used when neither the page nor the tab gave one.
  fallbackEventTitle: "New event",
};
