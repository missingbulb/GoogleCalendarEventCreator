// The month card's header AND its chip row, packed. A month card folds an event's
// scattered single-show days into one card (a button per day); the three events
// here cover all three commonTime branches side by side, and the first also
// exercises chip-row WRAPPING and the consecutive-days-aren't-merged rule (#330):
//   - SHARED time (Hebrew Conversation Club, Jun 5/6/7/12/19 all 7 PM): the shared
//     time leads the header ("7 PM · <location>"); the five bare DAY chips (month
//     banner + day) wrap to a second row, and the consecutive 5/6/7 stay three
//     separate chips — never collapsed into a range.
//   - DIFFERENT times (Rotating Recital Series, Jul 5/14/25 at 6/7/8 PM): no time
//     to share, so the header is just the location and each chip becomes a TIME
//     chip (date banner + that day's time) so no time is lost.
//   - ALL-DAY (Open Studios Month, Aug 5/14/25, date-only): no time to share, so
//     the header is just the location, with plain day chips.
"use strict";

module.exports = {
  description:
    "Month card surfaces a shared start time in its header (day chips that wrap when many, consecutive days not merged), else per-day time chips, else just the location (all-day dates)",
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
          { start: "2026-06-12T19:00:00", end: null },
          { start: "2026-06-19T19:00:00", end: null },
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
