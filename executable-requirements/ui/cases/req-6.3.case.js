// Per-leaf snapshot for requirement 6.3: a date with no time reads "All day".
// The filename (req-6.3) is the link; build-requirements-gallery.js embeds this
// image inline beneath 6.3 in executable-requirements/Requirements.md.
"use strict";

module.exports = {
  description: "a date with no time reads \"All day\"",
  data: { supported: true, events: [{ title: "Community Day", start: "2026-06-20", location: "Prospect Park" }] },
  listing: "none",
};
