// A multi-instance event split by date, mixing an all-day day, a two-show day,
// and a single-show day: Jun 17 (all-day) and Jun 21 (one timed show) are plain
// single cards, Jun 19 (two shows) is a same-day card — three cards in date
// order, the all-day one reading just like an ordinary single event.
module.exports = {
  description: "Split by date with an all-day day, a two-show day, and a single-show day",
  data: {
    supported: true,
    events: [
      {
        title: "Taiwan Film Week: The Left-Handed Girl",
        location: "Tel Aviv Cinematheque, רחוב הארבעה 5",
        ctz: "Asia/Jerusalem",
        times: [
          { start: "2026-06-17", end: null },
          { start: "2026-06-19T16:30:00", end: "2026-06-19T18:18:00" },
          { start: "2026-06-19T20:30:00", end: "2026-06-19T22:18:00" },
          { start: "2026-06-21T18:30:00", end: null },
        ],
      },
    ],
  },
  listing: "none",
};
