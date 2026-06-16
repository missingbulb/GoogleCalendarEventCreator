// A multi-instance event whose showings are different days of the SAME month,
// one show per night (a multi-night run): the days fold into one card whose icon
// shows the month with a "?" for the day, and each button leads with the ordinal
// day, with the time appended.
module.exports = {
  description:
    "Multi-instance, same month / different days: one 'month + ?' card; buttons show the day + time",
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
