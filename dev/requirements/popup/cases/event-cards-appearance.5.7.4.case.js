// Per-leaf snapshot for requirement 5.7.4: a month card mixing an all-day showing
// with a timed one renders each as a time chip so they visually differ — the timed
// chip shows its start time, the all-day chip reads "All day".
// The filename (event-cards-appearance.5.7.4) is the link; build-requirements-gallery.js embeds this
// image inline beneath 5.7.4 in dev/requirements/requirements.md.
"use strict";

module.exports = {
  description: "a month card mixing an all-day and a timed showing shows each as a time chip so they differ",
  data: { supported: true, events: [
    { title: "Festival Days", location: "Town Square", times: [
      { start: "2026-09-12" }, { start: "2026-09-19T18:30:00" },
    ] },
  ] },
  listing: "none",
};
