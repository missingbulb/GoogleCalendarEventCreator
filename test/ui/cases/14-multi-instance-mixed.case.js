// A multi-instance event mixing it all, to show the date aggregation split: one
// day (Jun 19) carries two timed shows, while two other days (an all-day Jun 17
// and a timed Jun 21) carry one each. So it renders as TWO cards — a same-day
// card for Jun 19's two times, and a multi-date "month + ?" card folding the two
// single-time days — the real shape a cinema's screening picker produces.
module.exports = {
  description:
    "Multi-instance aggregation split: a same-day card (one day, two times) + a multi-date 'month + ?' card",
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
