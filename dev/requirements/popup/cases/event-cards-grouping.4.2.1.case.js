// Two showings in the same month exercise the same-month grouping rule: one grouped card.
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
