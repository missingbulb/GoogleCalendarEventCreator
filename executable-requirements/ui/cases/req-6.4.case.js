// Per-leaf snapshot for requirement 6.4: a start that can't be parsed reads "No date found".
// The filename (req-6.4) is the link; build-requirements-gallery.js embeds this
// image inline beneath 6.4 in executable-requirements/Requirements.md.
"use strict";

module.exports = {
  description: "a start that can't be parsed reads \"No date found\"",
  data: { supported: true, events: [{ title: "Workshop (date to be announced)", location: "Central Library" }] },
  listing: "none",
};
