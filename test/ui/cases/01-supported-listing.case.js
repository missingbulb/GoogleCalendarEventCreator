// State 1 — supported host (a per-site source matched): show its events. A
// listing page yields several, so this shows two.
"use strict";

module.exports = {
  description: "Supported host: the extractor's events (a 2-event listing)",
  data: {
    supported: true,
    events: [
      {
        title: "NYC Tech Mixer 2026",
        start: "2026-06-25T18:00:00",
        end: "2026-06-25T21:00:00",
        location: "The Williamsburg Hotel Bar, Brooklyn",
      },
      {
        title: "Designers & Founders Coffee",
        start: "2026-06-26T09:00:00",
        location: "Devoción, Brooklyn",
      },
    ],
  },
  listing: "none",
};
