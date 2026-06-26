// Two showings in different months exercise the cross-month split rule: one card per month.
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
