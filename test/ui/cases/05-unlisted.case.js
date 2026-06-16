// State 5 — a complete fallback event on a host that's on neither list: show it
// AND offer to request first-class support via the right-aligned "Suggest
// Correction" link.
"use strict";

module.exports = {
  description: "Unlisted: show the event + a right-aligned 'Suggest Correction' link",
  data: {
    supported: false,
    events: [
      { title: "Annual Neighborhood Cleanup", start: "2026-08-05T09:00:00", location: "Riverside Park boathouse" },
    ],
  },
  listing: "none",
};
