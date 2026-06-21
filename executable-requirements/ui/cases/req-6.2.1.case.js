// Per-leaf snapshot for requirement 6.2.1: a start with an end shows an en-dash time range.
// The filename (req-6.2.1) is the link; build-requirements-gallery.js embeds this
// image inline beneath 6.2.1 in executable-requirements/Requirements.md.
"use strict";

module.exports = {
  description: "a start with an end shows an en-dash time range",
  data: { supported: true, events: [{ title: "Workshop", start: "2026-06-19T18:30:00", end: "2026-06-19T20:30:00", location: "Central Library" }] },
  listing: "none",
};
