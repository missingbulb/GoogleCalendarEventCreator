// Per-leaf snapshot for requirement 6.5: a card with no usable date shows no calendar chip.
// The filename (req-6.5) is the link; build-requirements-gallery.js embeds this
// image inline beneath 6.5 in executable-requirements/Requirements.md.
"use strict";

module.exports = {
  description: "a card with no usable date shows no calendar chip",
  data: { supported: true, events: [{ title: "Workshop (date to be announced)", location: "Central Library" }] },
  listing: "none",
};
