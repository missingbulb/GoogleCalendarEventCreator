// isPresentableFallbackEvent (title + location + start) filters a fallback event
// missing its START → empty "nothing found" state.
"use strict";

module.exports = {
  description: "fallback event with no start is treated as nothing found (empty state)",
  data: { supported: false, events: [{ title: "Neighborhood Mixer", location: "The Annex, Brooklyn" }] },
  listing: "none",
};
