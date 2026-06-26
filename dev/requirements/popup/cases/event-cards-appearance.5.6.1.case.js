// Dated 2025 vs the reference now 2026-06-01 (reference-time.js) so it's a prior
// year → gray "past" pill. (5.6.4 covers a past date earlier this year — the pill
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
