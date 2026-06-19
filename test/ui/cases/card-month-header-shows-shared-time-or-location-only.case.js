// The month-card header, all three branches side by side (one event per branch,
// each a run of scattered single-show days folded into one month card):
//
//   - SHARED time (5.7.1): Jun 5/6/7/14/25 all at 7 PM. The shared time leads the
//     header ("7 PM · <location>") and the buttons stay bare DAY chips (5.2). The
//     consecutive run 5–7 is NOT merged — a button per day (4.3).
//   - DIFFERING times (5.7.2): Jul 5/14/25 at 6/7/8 PM. No shared time, so the
//     header is location-only and each button becomes a TIME chip (5.3).
//   - ALL-DAY (5.7.3): Aug 5/14/25, date-only. No time to share, so the header is
//     location-only and the buttons stay plain day chips.
//
// All are month cards (4.2, 4.6) grouped by month.
"use strict";

module.exports = {
  description:
    "Three month cards: scattered dates that share one start time show it in the header over day chips; differing-time dates drop to a location-only header with time chips; all-day dates show a location-only header with day chips",
  requirements: [
    "4.2", "4.3", "4.6", "5.2", "5.3", "5.7.1", "5.7.2", "5.7.3",
  ],
  data: {
    supported: true,
    events: [
      {
        title: "Hebrew Conversation Club",
        location: "Beit Ariela Library, Tel Aviv",
        ctz: "Asia/Jerusalem",
        times: [
          { start: "2026-06-05T19:00:00", end: null },
          { start: "2026-06-06T19:00:00", end: null },
          { start: "2026-06-07T19:00:00", end: null },
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
