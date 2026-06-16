// State 2 — denylisted host: show nothing and prompt for nothing. The decision
// is deliberate, so even a complete scraped event is suppressed — no event, no
// request, not even the policy link.
"use strict";

module.exports = {
  description: "Denylisted host: 'No events found' (no link, no prompt) — even a complete event is suppressed",
  data: {
    supported: false,
    events: [
      { title: "Some Show", start: "2026-07-01T20:00:00", location: "The Venue" },
    ],
  },
  listing: "deny",
};
