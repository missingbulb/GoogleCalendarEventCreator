// Dated 2026-06-01 09:00 — the same day as the reference now (2026-06-01 12:00,
// reference-time.js) but earlier, so its start instant has passed → gray "past"
// pill, proving the pill is time-of-day aware (#507). (Contrast 5.6.3, no pill.)
"use strict";

module.exports = {
  description: "5.6.5 — a timed event earlier today (its start time already passed) shows the gray \"past\" pill",
  data: {
    supported: true,
    events: [
      {
        title: "Morning Roastery Tour",
        start: "2026-06-01T09:00:00",
        location: "The Annex, Brooklyn",
      },
    ],
  },
  listing: "none",
};
