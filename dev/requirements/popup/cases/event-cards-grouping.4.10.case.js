// A single instance spanning multiple months (Jun 28 → Jul 3) exercises the
// date-RANGE chip: month range as banner ("JUN–JUL") over day range as body ("28–3").
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
