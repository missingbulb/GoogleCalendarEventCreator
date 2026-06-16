// A multi-instance event whose showings are all-day on DIFFERENT dates (a film
// screened on several days, with no per-day time): the icon is a question mark
// and each instance button shows just its date.
module.exports = {
  description:
    "Multi-instance, different dates (all-day): icon is a '?', instance buttons show the dates",
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
