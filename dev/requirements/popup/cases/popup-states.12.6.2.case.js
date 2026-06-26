// isPresentableFallbackEvent (title + location + start) filters a fallback event
// missing its LOCATION → empty "nothing found" state.
"use strict";

module.exports = {
  description: "fallback event with no location is treated as nothing found (empty state)",
  data: { supported: false, events: [{ title: "Neighborhood Mixer", start: "2026-06-19T19:00:00" }] },
  listing: "none",
};
