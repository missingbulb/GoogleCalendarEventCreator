// Two showings on the same day (2026-06-01) vs the reference now 2026-06-01 12:00
// (reference-time.js): the 09:00 showing has passed → gray "past" pill; the 19:00
// showing is still to come → no pill. So the pill is per-instance, not per-card.
"use strict";

module.exports = {
  description: "5.6.6 — within a grouped card, each instance button shows the \"past\" pill by its OWN time (a passed showing past, a later one not)",
  data: {
    supported: true,
    events: [
      {
        title: "Open Studio Day",
        location: "The Annex, Brooklyn",
        times: [
          { start: "2026-06-01T09:00:00" },
          { start: "2026-06-01T19:00:00" },
        ],
      },
    ],
  },
  listing: "none",
};
