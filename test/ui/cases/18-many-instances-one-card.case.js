// ONE card holding many instances (#339): a single event with a long run of
// scattered single-show days folds into ONE month card that exposes a button per
// day. This stresses how a single card wraps a large grid of chips. The dates
// each start at a DIFFERENT hour, so there's no shared time to surface — the
// header drops to location-only and every chip becomes a TIME chip (a date banner
// over that day's own start time) so no time is lost (#324).
module.exports = {
  description:
    "Many instances in ONE card, each at a different hour: one month card whose chips all become date+time chips (no common-time header)",
  data: {
    supported: true,
    events: [
      {
        title: "Hebrew Conversation Club",
        location: "Beit Ariela Library, Tel Aviv",
        ctz: "Asia/Jerusalem",
        times: [
          { start: "2026-06-01T09:00:00", end: null },
          { start: "2026-06-03T10:30:00", end: null },
          { start: "2026-06-05T12:00:00", end: null },
          { start: "2026-06-08T13:30:00", end: null },
          { start: "2026-06-10T15:00:00", end: null },
          { start: "2026-06-12T16:30:00", end: null },
          { start: "2026-06-15T17:00:00", end: null },
          { start: "2026-06-17T18:30:00", end: null },
          { start: "2026-06-19T19:00:00", end: null },
          { start: "2026-06-22T20:30:00", end: null },
          { start: "2026-06-24T21:00:00", end: null },
          { start: "2026-06-26T22:30:00", end: null },
        ],
      },
    ],
  },
  listing: "none",
};
