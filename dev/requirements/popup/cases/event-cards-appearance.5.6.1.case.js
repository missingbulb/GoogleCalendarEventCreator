// Per-leaf snapshot case for requirement 5.6.1 — "a PAST event shows a gray
// 'past' pill". The filename (`event-cards-appearance.5.6.1`) IS the link to the
// requirement; the coverage gate reads it, and build-requirements-gallery.js embeds
// this image inline under 5.6.1 in dev/requirements/requirements.md. This is the
// worked EXAMPLE of the per-leaf migration target (issue #435) — one minimal popup
// that isolates exactly one requirement.
//
// Cases render against the pinned reference "now" 2026-06-01 (reference-time.js), so
// this 2025 date is in the past → its day chip carries a gray "past" pill on the
// calendar icon's corner. (5.6.4 covers a past date EARLIER THIS YEAR — the pill
// marks any past event, not just a prior year.)
"use strict";

module.exports = {
  description: "5.6.1 — a single card dated in the past shows a gray \"past\" pill on its calendar chip",
  data: {
    supported: true,
    events: [
      {
        title: "Last Year's Winter Gala",
        start: "2025-12-05T19:00:00",
        location: "The Old Town Hall",
      },
    ],
  },
  listing: "none",
};
