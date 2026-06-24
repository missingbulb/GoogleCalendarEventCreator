// Per-leaf snapshot for requirement 5.6.5: the "past" pill is time-of-day aware
// for a TIMED event — an event earlier TODAY whose start time has already passed
// shows the gray "past" pill, not only an event on a prior day (#507). The filename
// (event-cards-appearance.5.6.5) is the link; build-requirements-gallery.js embeds
// this image inline beneath 5.6.5 in dev/requirements/requirements.md.
//
// Dated 2026-06-01 at 09:00 — the SAME day as the reference "now" (2026-06-01
// 12:00, reference-time.js) but earlier, so its start instant has passed → gray
// "past" pill. (Contrast 5.6.3, dated later the same period, which shows no pill.)
"use strict";

module.exports = {
  description: "5.6.5 — a timed event earlier today (its start time already passed) shows the gray \"past\" pill",
  data: {
    supported: true,
    events: [
      {
        title: "Morning Roastery Tour",
        start: "2026-06-01T09:00:00",
        location: "The Annex, Brooklyn",
      },
    ],
  },
  listing: "none",
};
