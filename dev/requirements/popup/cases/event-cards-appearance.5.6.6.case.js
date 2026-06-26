// Per-leaf snapshot for requirement 5.6.6: the time-of-day "past" pill applies to
// the INNER instance buttons of a grouped card, each decided independently by its
// own time. The filename (event-cards-appearance.5.6.6) is the link;
// build-requirements-gallery.js embeds this image inline beneath 5.6.6 in
// requirements.md.
//
// Two showings on the SAME day (2026-06-01) at different times, against the
// reference "now" 2026-06-01 12:00 (reference-time.js): the 09:00 showing has
// passed → its chip carries the gray "past" pill; the 19:00 showing is still to
// come → its chip carries none. So the pill is per-instance, not per-card.
"use strict";

module.exports = {
  description: "5.6.6 — within a grouped card, each instance button shows the \"past\" pill by its OWN time (a passed showing past, a later one not)",
  data: {
    supported: true,
    events: [
      {
        title: "Open Studio Day",
        location: "The Annex, Brooklyn",
        times: [
          { start: "2026-06-01T09:00:00" },
          { start: "2026-06-01T19:00:00" },
        ],
      },
    ],
  },
  listing: "none",
};
