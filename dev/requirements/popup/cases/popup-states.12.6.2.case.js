// Per-leaf snapshot for requirement 12.6.2: a fallback event missing its LOCATION
// is incomplete, so the popup shows the empty "nothing found" state (chooseContent
// filters it out via isPresentableFallbackEvent).
"use strict";

module.exports = {
  description: "fallback event with no location is treated as nothing found (empty state)",
  data: { supported: false, events: [{ title: "Neighborhood Mixer", start: "2026-06-19T19:00:00" }] },
  listing: "none",
};
