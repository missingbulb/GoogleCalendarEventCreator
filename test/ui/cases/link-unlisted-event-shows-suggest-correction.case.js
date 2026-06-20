// State 5: a complete fallback event (title + location + start) on a host that's
// on neither list. The event card shows, and a small understated "Suggest
// Correction" link sits on the heading line, right-aligned (3.1, 3.3). Clicking
// it opens the prefilled source-request issue in a new tab and closes the popup
// (3.4) — a behavior verified in test/unit/events-view-actions.test.js, not here.
//
// (An allowlisted host, state 4, renders the same event with NO link — visually a
// plain events list, already covered by the single-card case — so it needs no
// separate snapshot.)
"use strict";

module.exports = {
  description:
    "Unlisted host with a complete fallback event: the event card plus a right-aligned, understated 'Suggest Correction' link on the heading line",
  requirements: {
    "1.2": "an event is shown, so the heading reads \"Add to Google Calendar\"",
    "3.1": "\"Suggest Correction\" sits on the heading line, right-aligned",
    "3.3": "the link uses the small, understated accent-blue treatment",
  },
  data: {
    supported: false,
    events: [
      {
        title: "Annual Neighborhood Cleanup",
        start: "2026-08-05T09:00:00",
        location: "Riverside Park boathouse",
      },
    ],
  },
  listing: "none",
};
