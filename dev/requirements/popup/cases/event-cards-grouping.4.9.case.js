// Fed shuffled on both axes — single cards out of order, and the grouped "Series"
// card's showings listed 20th/10th/15th — so the render must sort the cards by
// earliest start AND sort the buttons within the Series card.
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
