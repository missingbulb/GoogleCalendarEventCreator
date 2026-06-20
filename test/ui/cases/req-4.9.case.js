// Per-leaf snapshot for requirement 4.9: cards are ordered by earliest start regardless of page order.
// The filename (req-4.9) is the link; build-requirements-gallery.js embeds this
// image inline beneath 4.9 in docs/uiRequirements.md.
"use strict";

module.exports = {
  description: "cards are ordered by earliest start regardless of page order",
  data: { supported: true, events: [
    { title: "Latest", start: "2026-06-25T18:00:00", location: "Venue C" },
    { title: "Earliest", start: "2026-06-08T18:00:00", location: "Venue A" },
    { title: "Middle", start: "2026-06-17T18:00:00", location: "Venue B" },
  ] },
  listing: "none",
};
