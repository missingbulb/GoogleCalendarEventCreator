// Month grouping within a single month: Jun 10 and Jun 12 each have one show, so
// they fold into ONE month card (icon JUN over the 10–12 range, a button per
// day); Jun 11 has two shows, so it stays its own same-day card. Because cards
// order by their earliest instance, the month card (earliest Jun 10) comes
// before the Jun 11 same-day card even though it also holds Jun 12 — the
// out-of-strict-day-order read that month grouping accepts.
module.exports = {
  description:
    "Month grouping: two scattered single-show days fold into one month card; a two-show day stays a same-day card",
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
