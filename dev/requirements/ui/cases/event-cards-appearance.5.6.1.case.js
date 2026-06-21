// Per-leaf snapshot case for requirement 5.6.1 — "a PAST year shows a GRAY pill".
// The filename (`event-cards-appearance.5.6.1`) IS the link to the requirement; the coverage gate
// reads it, and build-requirements-gallery.js embeds this image inline under
// 5.6.1 in dev/requirements/requirements.md. This is the worked EXAMPLE of the per-leaf
// migration target (issue #435) — one minimal popup that isolates exactly one
// requirement.
//
// Cases render against REFERENCE_YEAR 2026 (popup-renderer.js), so a 2025 date is
// past → its day chip carries a gray year pill on the calendar icon's corner.
"use strict";

module.exports = {
  description: "5.6.1 — a single card dated in a past year shows a gray year pill on its calendar chip",
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
