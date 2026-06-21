// Per-leaf PROVISIONAL snapshot for requirement 4.10 (a `tbd: true` case): a
// single instance spanning MULTIPLE MONTHS (Jun 28 → Jul 3). Today its chip shows
// just the start day ("JUN 28") with an "All day" line — no date range across the
// span. This image is the CURRENT behavior, shown so we can decide whether a long
// / multi-month span should instead render a date range (see the TO BE DECIDED
// banner on 4.10).
"use strict";

module.exports = {
  tbd: true, // behavior not yet decided — this is a PROVISIONAL snapshot of current behavior
  description: "TBD: a single instance spanning Jun 28 → Jul 3 — current chip shows the start day only",
  data: {
    supported: true,
    events: [
      { title: "Cross-Month Residency", start: "2026-06-28", end: "2026-07-03", location: "Various venues" },
    ],
  },
  listing: "none",
};
