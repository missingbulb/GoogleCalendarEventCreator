// Per-leaf snapshot for requirement 4.2.3: the cross-month-instance grouping edge
// case. One event with three instances — Jun 15, a multi-day instance spanning
// Jun 28 → Jul 3, and Jul 10. The spanning instance groups by its START month
// (June), so it renders as a date-range chip (JUN–JUL / 28–3) in the June grouped
// card beside Jun 15; July holds the Jul 10 single card. It never duplicates under
// July.
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
