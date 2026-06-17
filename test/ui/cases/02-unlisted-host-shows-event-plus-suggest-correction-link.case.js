// State 5 — a complete fallback event on a host that's on neither list: show the
// event AND offer first-class support via the right-aligned "Suggest Correction"
// link on the heading line (it only appears when an event is shown, so it lives
// on the heading). One current-year event is enough — the link is the thing under
// test, so nothing else competes for the picture.
"use strict";

module.exports = {
  description:
    "Unlisted host with a complete event: show it plus a right-aligned 'Suggest Correction' link",
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
