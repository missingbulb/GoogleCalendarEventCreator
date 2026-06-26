// Per-leaf snapshot for requirement 5.6.8: an event that has STARTED but whose end
// is still in the future shows a red "ongoing" pill (it's happening now). The
// filename (event-cards-appearance.5.6.8) is the link; build-requirements-gallery.js
// embeds this image inline beneath 5.6.8 in requirements.md.
//
// Against the reference "now" 2026-06-01 12:00 (reference-time.js): start 09:00 has
// passed, end 18:00 is still ahead → the event is in progress → red "ongoing" pill.
// (A started event with NO end is "past" instead — that's 5.6.5.)
"use strict";

module.exports = {
  description: "5.6.8 — an event whose start has passed but whose end is still in the future shows a red \"ongoing\" pill",
  data: {
    supported: true,
    events: [
      {
        title: "All-Day Maker Fair",
        start: "2026-06-01T09:00:00",
        end: "2026-06-01T18:00:00",
        location: "The Annex, Brooklyn",
      },
    ],
  },
  listing: "none",
};
