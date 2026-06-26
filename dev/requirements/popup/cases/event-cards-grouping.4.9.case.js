// Per-leaf snapshot for requirement 4.9, BOTH parts: (1) cards are ordered by
// their earliest showing's start, and (2) an event's showings are ordered WITHIN
// its card. Fed shuffled on both axes — the single cards out of order, and the
// grouped "Series" card's three June showings listed 20th/10th/15th — so the
// render must sort the cards (Earliest Jun 8 · Series earliest Jun 10 · Latest
// Jun 25) and sort the buttons inside the Series card (10 · 15 · 20).
// The filename (event-cards-grouping.4.9) is the link; build-requirements-gallery.js embeds this
// image inline beneath 4.9 in requirements.md.
"use strict";

module.exports = {
  description:
    "cards sorted by earliest start AND a grouped card's shuffled showings sorted within it, regardless of page order",
  data: {
    supported: true,
    events: [
      { title: "Latest", start: "2026-06-25T18:00:00", location: "Venue C" },
      {
        title: "Series",
        location: "Venue B",
        times: [
          { start: "2026-06-20T19:00:00" },
          { start: "2026-06-10T19:00:00" },
          { start: "2026-06-15T19:00:00" },
        ],
      },
      { title: "Earliest", start: "2026-06-08T18:00:00", location: "Venue A" },
    ],
  },
  listing: "none",
};
