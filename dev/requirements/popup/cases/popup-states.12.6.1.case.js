// isPresentableEvent (title + location + start) filters an unsupported host's event
// missing its TITLE → empty "nothing found" state.
"use strict";

module.exports = {
  description: "unsupported host's event with no title is treated as nothing found (empty state)",
  data: { supported: false, events: [{ start: "2026-06-19T19:00:00", location: "The Annex, Brooklyn" }] },
  listing: "none",
};
