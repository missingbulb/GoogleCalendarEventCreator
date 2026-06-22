// Per-leaf snapshot for requirement 12.6.3: a fallback event missing its START is
// incomplete, so the popup shows the empty "nothing found" state (chooseContent
// filters it out via isPresentableFallbackEvent).
"use strict";

module.exports = {
  description: "fallback event with no start is treated as nothing found (empty state)",
  data: { supported: false, events: [{ title: "Neighborhood Mixer", location: "The Annex, Brooklyn" }] },
  listing: "none",
};
