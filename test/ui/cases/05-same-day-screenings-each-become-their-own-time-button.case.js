// A same-day card: several showings of one event on ONE date. The card itself
// isn't clickable — each showing is its own TIME chip button (the date in the
// banner, the time in the body), so "event instances on the same date are
// different buttons". The three times include a non-round one (4:30 PM) to show
// minute formatting in a chip; the Hebrew in the location exercises bidi text.
"use strict";

module.exports = {
  description:
    "Same-day screenings each become their own time button: one same-day card with a chip per showing",
  data: {
    supported: true,
    events: [
      {
        title: "The Left-Handed Girl",
        location: "Tel Aviv Cinematheque, רחוב הארבעה 5",
        ctz: "Asia/Jerusalem",
        times: [
          { start: "2026-06-19T13:00:00", end: null },
          { start: "2026-06-19T16:30:00", end: null },
          { start: "2026-06-19T20:00:00", end: null },
        ],
      },
    ],
  },
  listing: "none",
};
