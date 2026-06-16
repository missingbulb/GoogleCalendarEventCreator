// A multi-instance event whose showings are on DIFFERENT dates (a multi-night
// concert run, one show per night): the left icon is a question mark (the card
// has no single date), and each instance button leads with its date, with the
// time appended.
module.exports = {
  description:
    "Multi-instance, different dates (timed): icon is a '?', instance buttons show date · time",
  data: {
    supported: true,
    events: [
      {
        title: "Berry Sakharof — Summer Tour",
        location: "Peace Forest, Jerusalem",
        ctz: "Asia/Jerusalem",
        times: [
          { start: "2026-06-17T21:00:00", end: null },
          { start: "2026-06-18T21:00:00", end: null },
          { start: "2026-06-20T21:00:00", end: null },
        ],
      },
    ],
  },
  listing: "none",
};
