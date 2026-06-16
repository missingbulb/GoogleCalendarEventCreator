// A multi-instance event mixing it all: several dates (so the icon is a '?'),
// one of them an all-day showing, another carrying two timed shows, and a third
// a single timed show. The instance buttons each lead with the date and append
// the time when there is one — the real shape a cinema's screening picker
// produces.
module.exports = {
  description:
    "Multi-instance, mixed: several dates incl. an all-day one and a date with two times; icon is a '?'",
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
