// The consecutive-run exception: within June, three back-to-back single-show
// days (Jun 5, 6, 7) collapse into ONE clickable multi-day card — icon JUN over
// the 5–7 range, the line reading "Jun 5 – 7 · <location>" (a span, no times) —
// while the remaining scattered June days (14, 25) fold into a separate month
// card and the lone July date is its own single card. All four card kinds the
// grouping can produce, side by side: multi-day, month, and single.
module.exports = {
  description:
    "Consecutive run: Jun 5–7 collapse into one clickable multi-day card; scattered Jun 14/25 stay a month card; July a single card",
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
