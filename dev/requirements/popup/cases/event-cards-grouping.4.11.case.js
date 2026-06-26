// A once-per-date run with ONE busy date (Aug 5 has a second showing) splits into
// three cards — run before (Aug 3/4), the busy Aug 5 alone, run after (Aug 6):
// showings grouped in a card differ only by date.
"use strict";

module.exports = {
  description: "a date with an extra showing splits a daily run into run / busy date / run cards",
  data: { supported: true, events: [
    { title: "Phil Ellis: Bath Mat", location: "Monkey Barrel Comedy", times: [
      { start: "2026-08-03T13:55:00", end: "2026-08-03T14:55:00" },
      { start: "2026-08-04T13:55:00", end: "2026-08-04T14:55:00" },
      { start: "2026-08-05T13:55:00", end: "2026-08-05T14:55:00" },
      { start: "2026-08-05T16:00:00", end: "2026-08-05T17:00:00" },
      { start: "2026-08-06T13:55:00", end: "2026-08-06T14:55:00" },
    ] },
  ] },
  listing: "none",
};
