// Dated 2026-02 — same year as the reference now 2026-06-01 (reference-time.js) but
// before it, so it's past → gray "past" pill, like 5.6.1's prior-year card.
"use strict";

module.exports = {
  description: "a past event earlier THIS year (before today, same year) shows the gray \"past\" pill",
  data: {
    supported: true,
    events: [{ title: "Winter Members' Preview", start: "2026-02-14T18:00:00", location: "The Annex, Brooklyn" }],
  },
  listing: "none",
};
