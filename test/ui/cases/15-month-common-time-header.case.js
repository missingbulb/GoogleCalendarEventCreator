// The common-time header on a month card (#324). Three events, each a run of
// scattered single-show days that fold into one month card, exercise all three
// branches of commonTime side by side:
//   - SAME times: Jun 5/14/25 all at 7 PM -> the header reads "7 PM · <location>"
//     (the time the day chips can't show, surfaced above the icons).
//   - DIFFERENT times: Jul 5/14/25 at 6/7/8 PM -> no single time to share, so the
//     header is just the location and each chip becomes a TIME chip (date banner
//     over that day's time) so no time is lost.
//   - NO times (all-day): Aug 5/14/25 with date-only starts -> no time to share,
//     header is just the location.
module.exports = {
  description:
    "Month card common-time header: scattered dates that share one start time show it above the icons; differing-time and all-day month cards show only the location",
  data: {
    supported: true,
    events: [
      {
        title: "Hebrew Conversation Club",
        location: "Beit Ariela Library, Tel Aviv",
        ctz: "Asia/Jerusalem",
        times: [
          { start: "2026-06-05T19:00:00", end: null },
          { start: "2026-06-14T19:00:00", end: null },
          { start: "2026-06-25T19:00:00", end: null },
        ],
      },
      {
        title: "Rotating Recital Series",
        location: "Felicja Blumental Center, Tel Aviv",
        ctz: "Asia/Jerusalem",
        times: [
          { start: "2026-07-05T18:00:00", end: null },
          { start: "2026-07-14T19:00:00", end: null },
          { start: "2026-07-25T20:00:00", end: null },
        ],
      },
      {
        title: "Open Studios Month",
        location: "Hamiffal, Jerusalem",
        ctz: "Asia/Jerusalem",
        times: [
          { start: "2026-08-05", end: null },
          { start: "2026-08-14", end: null },
          { start: "2026-08-25", end: null },
        ],
      },
    ],
  },
  listing: "none",
};
