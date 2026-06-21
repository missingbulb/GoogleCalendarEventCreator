// Per-leaf PROVISIONAL snapshot for requirement 4.2.3 (a `tbd: true` case): the
// cross-month-instance grouping edge case. One event with three instances — Jun 15,
// a multi-day instance spanning Jun 28 → Jul 3, and Jul 10. Today the spanning
// instance groups by its START (June), so the render shows a June grouped card
// (Jun 15 + Jun 28) and a July single card (Jul 10) — the span never surfaces under
// July. This image is the CURRENT behavior, shown so the right behavior can be
// decided (see the TO BE DECIDED banner on 4.2.3).
"use strict";

module.exports = {
  tbd: true, // behavior not yet decided — this is a PROVISIONAL snapshot of current behavior
  description: "TBD edge: one event with Jun 15, a Jun 28→Jul 3 span, and Jul 10 — current grouping",
  data: {
    supported: true,
    events: [
      {
        title: "Summer Residency",
        location: "Hamiffal",
        times: [
          { start: "2026-06-15T19:00:00" },
          { start: "2026-06-28", end: "2026-07-03" },
          { start: "2026-07-10T19:00:00" },
        ],
      },
    ],
  },
  listing: "none",
};
