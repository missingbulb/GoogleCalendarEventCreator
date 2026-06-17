// Consecutive days are NOT merged (#330): three back-to-back single-show days
// (Jun 5, 6, 7) and the scattered Jun 14/25 all fold into ONE month card with a
// button per day — never collapsed into a single multi-day span — while the lone
// July date is its own single card. Every date starts at 8:30 PM, so the month
// card's header carries that shared time above the icons ("8:30 PM · <location>",
// #324). A card built from N instances always exposes N buttons.
module.exports = {
  description:
    "Consecutive days aren't merged: Jun 5–7 + scattered Jun 14/25 are one month card with a button per day; July is a single card",
  data: {
    supported: true,
    events: [
      {
        title: "Open-Air Film Nights",
        location: "Hayarkon Park, Tel Aviv",
        ctz: "Asia/Jerusalem",
        times: [
          { start: "2026-06-05T20:30:00", end: null },
          { start: "2026-06-06T20:30:00", end: null },
          { start: "2026-06-07T20:30:00", end: null },
          { start: "2026-06-14T20:30:00", end: null },
          { start: "2026-06-25T20:30:00", end: null },
          { start: "2026-07-01T20:30:00", end: null },
        ],
      },
    ],
  },
  listing: "none",
};
