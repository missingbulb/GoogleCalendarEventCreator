// Per-leaf snapshot for requirement 6.1.2: a non-round time keeps its minutes ("6:30 PM").
// The filename (date-time-display.6.1.2) is the link; build-requirements-gallery.js embeds this
// image inline beneath 6.1.2 in requirements.md.
"use strict";

module.exports = {
  description: "a non-round time keeps its minutes (\"6:30 PM\")",
  data: { supported: true, events: [{ title: "Evening Talk", start: "2026-06-19T18:30:00", location: "Central Library" }] },
  listing: "none",
};
