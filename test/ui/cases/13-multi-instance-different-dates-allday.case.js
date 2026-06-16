// A multi-instance event whose showings are all-day on different days of the
// SAME month (a film screened on several days, with no per-day time): the days
// fold into one card whose icon is the month with a "?" for the day, and each
// button shows just its ordinal day.
module.exports = {
  description:
    "Multi-instance, same month / all-day days: one 'month + ?' card; buttons show the days",
  data: {
    supported: true,
    events: [
      {
        title: "Poetry in the Bookstores",
        location: "Tel Aviv Cinematheque",
        ctz: "Asia/Jerusalem",
        times: [
          { start: "2026-06-18", end: null },
          { start: "2026-06-19", end: null },
          { start: "2026-06-20", end: null },
        ],
      },
    ],
  },
  listing: "none",
};
