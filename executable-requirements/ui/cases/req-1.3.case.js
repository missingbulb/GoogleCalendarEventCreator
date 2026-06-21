// Per-leaf snapshot for requirement 1.3: with nothing shown, the heading reads "No events found on this page".
// The filename (req-1.3) is the link; build-requirements-gallery.js embeds this
// image inline beneath 1.3 in executable-requirements/Requirements.md.
"use strict";

module.exports = {
  description: "with nothing shown, the heading reads \"No events found on this page\"",
  data: { supported: false, events: [] },
  listing: "none",
};
