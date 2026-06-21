// Per-leaf snapshot for requirement 4.2.2: two showings in different months split
// into one card per month.
// The filename (event-cards-grouping.4.2.2) is the link; build-requirements-gallery.js embeds this
// image inline beneath 4.2.2 in executable-requirements/Requirements.md.
"use strict";

module.exports = {
  description: "one event with a June and a July showing splits into two separate single cards",
  data: {
    supported: true,
    events: [
      {
        title: "Recital Series",
        location: "Felicja Blumental Center",
        times: [{ start: "2026-06-19T19:00:00" }, { start: "2026-07-19T19:00:00" }],
      },
    ],
  },
  listing: "none",
};
