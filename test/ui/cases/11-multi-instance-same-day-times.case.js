// A multi-instance event whose showings are all on ONE day: the left icon shows
// that date, and each instance button shows its time (a range, since these have
// end times). This is the "pick which screening" card for a single-day film.
module.exports = {
  description:
    "Multi-instance, one date: icon shows the date, instance buttons show the times (with ranges)",
  data: {
    supported: true,
    events: [
      {
        title: "Sentimental Value",
        location: "Tel Aviv Cinematheque, רחוב הארבעה 5",
        ctz: "Asia/Jerusalem",
        times: [
          { start: "2026-06-19T16:30:00", end: "2026-06-19T18:18:00" },
          { start: "2026-06-19T20:30:00", end: "2026-06-19T22:18:00" },
        ],
      },
    ],
  },
  listing: "none",
};
