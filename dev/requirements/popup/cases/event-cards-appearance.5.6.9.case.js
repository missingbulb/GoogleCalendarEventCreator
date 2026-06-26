// Per-leaf snapshot for requirement 5.6.9: the "ongoing" pill is decided per chip,
// like "past" (5.6.6) and the future-year pill (5.6.7) — within a grouped card each
// instance button reflects its OWN start/end. The filename
// (event-cards-appearance.5.6.9) is the link; build-requirements-gallery.js embeds
// this image inline beneath 5.6.9 in requirements.md.
//
// Two showings on the SAME day (2026-06-01) against the reference "now" 2026-06-01
// 12:00 (reference-time.js): the 06:00–08:00 showing has ended → gray "past" pill;
// the 10:00–16:00 showing has started and not yet ended → red "ongoing" pill. So a
// card can carry both at once, one per instance.
"use strict";

module.exports = {
  description: "5.6.9 — within a grouped card, each instance button shows its own pill: a finished showing reads \"past\", a showing in progress reads \"ongoing\"",
  data: {
    supported: true,
    events: [
      {
        title: "Studio Drop-In Sessions",
        location: "The Annex, Brooklyn",
        times: [
          { start: "2026-06-01T06:00:00", end: "2026-06-01T08:00:00" },
          { start: "2026-06-01T10:00:00", end: "2026-06-01T16:00:00" },
        ],
      },
    ],
  },
  listing: "none",
};
