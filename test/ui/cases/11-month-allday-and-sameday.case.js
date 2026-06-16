// Month grouping where the scattered days mix an ALL-DAY day and a timed day:
// Jun 17 (all-day) and Jun 21 (one timed show) each have a single instance, so
// they fold into one month card as plain day buttons (17, 21) — the all-day-ness
// isn't shown on the button, only the day. Jun 19 (two shows) stays its own
// same-day card.
module.exports = {
  description:
    "Month grouping with an all-day day and a timed day folding into one month card, plus a same-day card",
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
