// One event splitting into MULTIPLE cards of every kind — the headline of the
// month-grouping model (an event keeps its showings in times[], and toCards turns
// them into cards by day/month; instances are never merged). This event's five
// showings become three cards, ordered by earliest instance:
//   - a MONTH card for its two single-show June days (Jun 10 & 12, both 8 PM ->
//     shared-time header + day chips);
//   - a SAME-DAY card for the day with two shows (Jun 11 at 6 & 9 PM -> time chips,
//     location-only header);
//   - a SINGLE card for the lone July day (Jul 3) — whole-card clickable, with the
//     chevron the grouped cards don't have.
// Note the order: the month card (earliest Jun 10) sits BEFORE the same-day card
// (Jun 11) even though Jun 11 falls between its two days — cards sort by earliest
// instance, the out-of-strict-day-order read that month grouping accepts.
"use strict";

module.exports = {
  description:
    "One event splits into several cards: a month card (its single-show June days), a same-day card (the two-show day), and a single card (the lone July day)",
  data: {
    supported: true,
    events: [
      {
        title: "Open-Air Cinema",
        location: "Hayarkon Park, Tel Aviv",
        ctz: "Asia/Jerusalem",
        times: [
          { start: "2026-06-10T20:00:00", end: null },
          { start: "2026-06-11T18:00:00", end: null },
          { start: "2026-06-11T21:00:00", end: null },
          { start: "2026-06-12T20:00:00", end: null },
          { start: "2026-07-03T20:00:00", end: null },
        ],
      },
    ],
  },
  listing: "none",
};
