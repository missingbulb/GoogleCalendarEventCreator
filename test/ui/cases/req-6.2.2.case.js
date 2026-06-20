// Per-leaf snapshot for requirement 6.2.2: an end not after the start is dropped to a single time.
// The filename (req-6.2.2) is the link; build-requirements-gallery.js embeds this
// image inline beneath 6.2.2 in docs/uiRequirements.md.
"use strict";

module.exports = {
  description: "an end not after the start is dropped to a single time",
  data: { supported: true, events: [{ title: "Office Hours", start: "2026-08-04T10:00:00", end: "2026-08-04T10:00:00", location: "Grand Army Plaza" }] },
  listing: "none",
};
