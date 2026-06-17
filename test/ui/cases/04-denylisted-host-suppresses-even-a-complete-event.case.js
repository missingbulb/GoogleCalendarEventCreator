// State 2 — denylisted host: show nothing, prompt for nothing. The decision is
// deliberate, so even a COMPLETE scraped event (title + location + start) is
// suppressed — the empty glyph alone, no event, no request, not even the policy
// link. The complete event in the data is what makes the suppression the point:
// remove it and this is just an empty page. (Contrast case 03's glyph, which
// carries the "Disagree?" link.)
"use strict";

module.exports = {
  description:
    "Denylisted host suppresses even a complete event: the empty glyph with no link or prompt",
  data: {
    supported: false,
    events: [
      { title: "Some Show", start: "2026-07-01T20:00:00", location: "The Venue" },
    ],
  },
  listing: "deny",
};
