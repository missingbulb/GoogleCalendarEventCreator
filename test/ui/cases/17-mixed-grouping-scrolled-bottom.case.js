// The same heterogeneous, many-instance listing as case 16 but scrolled all the
// way to the bottom (#339): the cards are mixed grouping styles (singles, a
// same-day card, a shared-time month card, an all-day month card), so the end's
// count cue proves it sums EVENT INSTANCES across every card type, not cards. The
// list overflows, so at the bottom only the top fade shows (more above).
"use strict";

const { scrollToBottom } = require("../actions");

const single = (n, day) => ({
  title: `Neighborhood Meetup #${n}`,
  location: "Pioneer Works, Brooklyn",
  times: [{ start: `2026-06-${day}T18:00:00`, end: `2026-06-${day}T20:00:00` }],
});

module.exports = {
  description:
    "Many mixed-grouping instances scrolled to the bottom: count cue sums instances across single, same-day, and month cards; top fade only",
  data: {
    supported: true,
    events: [
      single(1, "02"),
      single(2, "03"),
      // Same-day: four screenings on one day -> one same-day card, a button per time.
      {
        title: "Poetry in the Bookstores",
        location: "Tel Aviv Cinematheque",
        ctz: "Asia/Jerusalem",
        times: [
          { start: "2026-06-04T11:00:00", end: null },
          { start: "2026-06-04T14:00:00", end: null },
          { start: "2026-06-04T17:00:00", end: null },
          { start: "2026-06-04T20:00:00", end: null },
        ],
      },
      single(3, "05"),
      // Month card: scattered days sharing one 7 PM start -> common-time header.
      {
        title: "Hebrew Conversation Club",
        location: "Beit Ariela Library, Tel Aviv",
        ctz: "Asia/Jerusalem",
        times: [
          { start: "2026-06-08T19:00:00", end: null },
          { start: "2026-06-15T19:00:00", end: null },
          { start: "2026-06-22T19:00:00", end: null },
          { start: "2026-06-29T19:00:00", end: null },
        ],
      },
      single(4, "09"),
      // All-day month card: scattered date-only days -> location-only header.
      {
        title: "Open Studios Month",
        location: "Hamiffal, Jerusalem",
        ctz: "Asia/Jerusalem",
        times: [
          { start: "2026-07-05", end: null },
          { start: "2026-07-14", end: null },
          { start: "2026-07-25", end: null },
        ],
      },
      single(5, "11"),
      single(6, "12"),
      single(7, "16"),
    ],
  },
  listing: "none",
  action: scrollToBottom,
};
