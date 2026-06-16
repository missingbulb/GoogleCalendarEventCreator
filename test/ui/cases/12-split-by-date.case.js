// Splitting is strictly by date: a multi-instance event spread across days
// becomes one card per day. Here Jun 10 (one show) and Jun 12 (one show) are
// plain single cards, while Jun 11 (two shows) is a same-day card — so it reads
// as three cards in date order, none spanning more than its own day.
module.exports = {
  description:
    "Split by date: a day with two times is a same-day card; the other single-time days are plain cards",
  data: {
    supported: true,
    events: [
      {
        title: "Late Night Comedy Series",
        location: "The Stand, Tel Aviv",
        ctz: "Asia/Jerusalem",
        times: [
          { start: "2026-06-10T20:00:00", end: null },
          { start: "2026-06-11T21:00:00", end: null },
          { start: "2026-06-11T23:00:00", end: null },
          { start: "2026-06-12T23:00:00", end: null },
        ],
      },
    ],
  },
  listing: "none",
};
