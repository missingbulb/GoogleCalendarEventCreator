// Per-leaf snapshot for requirement 12.6.1: a fallback event missing its TITLE is
// incomplete, so the popup shows the empty "nothing found" state — chooseContent
// filters it out via isPresentableFallbackEvent (title + location + start). The
// three 12.6.* snapshots render the same empty state from three different
// inputs; each pins that a fallback event missing THAT one field is rejected.
"use strict";

module.exports = {
  description: "fallback event with no title is treated as nothing found (empty state)",
  data: { supported: false, events: [{ start: "2026-06-19T19:00:00", location: "The Annex, Brooklyn" }] },
  listing: "none",
};
