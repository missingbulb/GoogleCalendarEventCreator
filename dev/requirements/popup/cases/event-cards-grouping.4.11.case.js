// Per-leaf snapshot for requirement 4.11 (#509): a once-per-date run with ONE busy
// date splits into three cards — the run before (Aug 3/4 as day chips under their
// shared 1:55 PM header), the busy Aug 5 on its own card (its two showings shown by
// time), then the run after (Aug 6). Showings grouped in a card differ only by date.
// The filename (event-cards-grouping.4.11) is the link; build-requirements-gallery.js embeds this
// image inline beneath 4.11 in dev/requirements/requirements.md.
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
