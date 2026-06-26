// Two showings in a future year (2027) vs the reference now 2026-06-01
// (reference-time.js): both future-year, so each instance chip carries the green
// "2027" pill — per-chip, future as well as past (the future counterpart of 5.6.6).
"use strict";

module.exports = {
  description: "5.6.7 — within a grouped card, each instance button for a future year carries the green year pill",
  data: {
    supported: true,
    events: [
      {
        title: "Spring Open Studio",
        location: "The Annex, Brooklyn",
        times: [
          { start: "2027-03-14T11:00:00" },
          { start: "2027-03-14T19:00:00" },
        ],
      },
    ],
  },
  listing: "none",
};
