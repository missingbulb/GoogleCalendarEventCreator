// Month grouping + the same-day card + the out-of-strict-order trade, from ONE
// event. June has three single-show days (10, 12 — folded into a month card) and
// one two-show day (11 — its own same-day card). Because cards sort by their
// earliest instance, the month card (earliest Jun 10) renders BEFORE the Jun 11
// same-day card even though 11 < 12 — the accepted out-of-order read (4.10).
//
// Both cards are unclickable containers (5.5) with no single left icon (4.7) — a
// button per instance (4.5, 4.6), never a merged span (the multi-instance model).
// Jun 10/12 carry different (single) times, so the month card's buttons are TIME
// chips showing just the time (5.3.1) and its header is location-only (5.7.2). The
// two Jun 11 screenings carry a start AND end, so the same-day card's buttons show
// the en-dash time RANGE inside the button (5.3.2). Pressing an individual
// instance button is this card type's action (9.2).
"use strict";

module.exports = {
  description:
    "One event's June showings: single-show days 10 & 12 fold into a month card (a time-chip button per day), the two-show day 11 stays its own same-day card whose buttons show each screening's start–end range — and the month card sorts first despite holding day 12",
  requirements: [
    "4.2", "4.5", "4.6", "4.7", "4.10",
    "5.3.1", "5.3.2", "5.5", "5.7.2", "9.2",
  ],
  data: {
    supported: true,
    events: [
      {
        title: "Late Night Comedy Series",
        location: "The Stand, Tel Aviv",
        ctz: "Asia/Jerusalem",
        times: [
          { start: "2026-06-10T20:00:00", end: null },
          { start: "2026-06-11T18:00:00", end: "2026-06-11T20:00:00" },
          { start: "2026-06-11T21:00:00", end: "2026-06-11T23:00:00" },
          { start: "2026-06-12T18:00:00", end: null },
        ],
      },
    ],
  },
  listing: "none",
};
