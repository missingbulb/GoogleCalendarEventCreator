// ONE card holding many instances (#339): a single event with a long run of
// scattered single-show days folds into ONE month card that exposes a button per
// day. This stresses how a single card wraps a large grid of day chips (here all
// at 7 PM, so the common-time header carries "7 PM · <location>" above the icons),
// rather than how many separate cards stack.
module.exports = {
  description:
    "Many instances in ONE card: a single event's dozen scattered dates fold into one month card with a button per day",
  data: {
    supported: true,
    events: [
      {
        title: "Hebrew Conversation Club",
        location: "Beit Ariela Library, Tel Aviv",
        ctz: "Asia/Jerusalem",
        times: [
          { start: "2026-06-01T19:00:00", end: null },
          { start: "2026-06-03T19:00:00", end: null },
          { start: "2026-06-05T19:00:00", end: null },
          { start: "2026-06-08T19:00:00", end: null },
          { start: "2026-06-10T19:00:00", end: null },
          { start: "2026-06-12T19:00:00", end: null },
          { start: "2026-06-15T19:00:00", end: null },
          { start: "2026-06-17T19:00:00", end: null },
          { start: "2026-06-19T19:00:00", end: null },
          { start: "2026-06-22T19:00:00", end: null },
          { start: "2026-06-24T19:00:00", end: null },
          { start: "2026-06-26T19:00:00", end: null },
        ],
      },
    ],
  },
  listing: "none",
};
