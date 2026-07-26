// isPresentableEvent (title + location + start) filters an unsupported host's event
// missing its START → empty "nothing found" state.
"use strict";

module.exports = {
  description: "unsupported host's event with no start is treated as nothing found (empty state)",
  data: { supported: false, events: [{ title: "Neighborhood Mixer", location: "The Annex, Brooklyn" }] },
  listing: "none",
};
