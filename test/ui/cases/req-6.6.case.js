// Per-leaf snapshot for requirement 6.6: a UTC offset is stripped to the literal wall-clock time, not re-zoned.
// The filename (req-6.6) is the link; build-requirements-gallery.js embeds this
// image inline beneath 6.6 in docs/uiRequirements.md.
"use strict";

module.exports = {
  description: "a UTC offset is stripped to the literal wall-clock time, not re-zoned",
  data: { supported: true, events: [{ title: "Holiday Concert", start: "2026-07-04T21:00:00-05:00", location: "The Bandshell" }] },
  listing: "none",
};
