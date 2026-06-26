// Two showings on the same day (2026-06-01) vs the reference now 2026-06-01 12:00
// (reference-time.js): the 06:00–08:00 showing has ended → gray "past" pill; the
// 10:00–16:00 showing is in progress → red "ongoing" pill. So a card can carry both
// at once, one per instance (per-chip "ongoing", like 5.6.6/5.6.7).
"use strict";

module.exports = {
  description: "5.6.9 — within a grouped card, each instance button shows its own pill: a finished showing reads \"past\", a showing in progress reads \"ongoing\"",
  data: {
    supported: true,
    events: [
      {
        title: "Studio Drop-In Sessions",
        location: "The Annex, Brooklyn",
        times: [
          { start: "2026-06-01T06:00:00", end: "2026-06-01T08:00:00" },
          { start: "2026-06-01T10:00:00", end: "2026-06-01T16:00:00" },
        ],
      },
    ],
  },
  listing: "none",
};
