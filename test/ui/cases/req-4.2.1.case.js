// Per-leaf snapshot for requirement 4.2.1: two showings in the same month group
// into one grouped card.
// The filename (req-4.2.1) is the link; build-requirements-gallery.js embeds this
// image inline beneath 4.2.1 in docs/uiRequirements.md.
"use strict";

module.exports = {
  description: "one event with two June showings groups into a single grouped (month) card",
  data: {
    supported: true,
    events: [
      {
        title: "Recital Series",
        location: "Felicja Blumental Center",
        times: [{ start: "2026-06-05T19:00:00" }, { start: "2026-06-19T19:00:00" }],
      },
    ],
  },
  listing: "none",
};
