// Per-leaf snapshot for requirement 5.6.7: the green future-YEAR pill also applies
// to the INNER instance buttons of a grouped card — the future-year counterpart of
// 5.6.6 (which covers the per-instance "past" pill). The filename
// (event-cards-appearance.5.6.7) is the link; build-requirements-gallery.js embeds
// this image inline beneath 5.6.7 in requirements.md.
//
// Two showings on the SAME day in a FUTURE year (2027, vs the reference "now"
// 2026-06-01, reference-time.js): neither is past and both are a future year, so
// each instance chip carries the green "2027" pill — the pill is decided per chip,
// future as well as past.
"use strict";

module.exports = {
  description: "5.6.7 — within a grouped card, each instance button for a future year carries the green year pill",
  data: {
    supported: true,
    events: [
      {
        title: "Spring Open Studio",
        location: "The Annex, Brooklyn",
        times: [
          { start: "2027-03-14T11:00:00" },
          { start: "2027-03-14T19:00:00" },
        ],
      },
    ],
  },
  listing: "none",
};
