// Per-leaf snapshot for requirement 4.8: a single instance spanning several days stays one card, not split per day.
// The filename (req-4.8) is the link; build-requirements-gallery.js embeds this
// image inline beneath 4.8 in executable-requirements/Requirements.md.
"use strict";

module.exports = {
  description: "a single instance spanning several days stays one card, not split per day",
  data: { supported: true, events: [
    { title: "Open Studios Festival", start: "2026-09-15", end: "2026-09-18", location: "Various venues" },
  ] },
  listing: "none",
};
