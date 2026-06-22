// Per-leaf snapshot for requirement 4.10: a single instance spanning MULTIPLE
// MONTHS (Jun 28 → Jul 3) renders as a date-RANGE chip — the month range as the
// banner ("JUN–JUL") over the day range as the body ("28–3") — with its time (or
// "All day") on the line as usual.
"use strict";

module.exports = {
  description: "a single instance spanning Jun 28 → Jul 3 shows a JUN–JUL / 28–3 date-range chip",
  data: {
    supported: true,
    events: [
      { title: "Cross-Month Residency", start: "2026-06-28", end: "2026-07-03", location: "Various venues" },
    ],
  },
  listing: "none",
};
