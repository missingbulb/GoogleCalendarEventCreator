// A multi-day instance (Jun 28 → Jul 3) among single instances (Jun 15, Jul 10)
// exercises that a span groups by its START month: it lands in the June grouped
// card as a range chip beside Jun 15, never duplicating under July.
"use strict";

module.exports = {
  description: "one event with Jun 15, a Jun 28→Jul 3 span (lumped under June as a range chip), and Jul 10",
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
