// Per-leaf snapshot for requirement 5.7.2: differing times drop to a location-only header with time chips.
// The filename (req-5.7.2) is the link; build-requirements-gallery.js embeds this
// image inline beneath 5.7.2 in docs/uiRequirements.md.
"use strict";

module.exports = {
  description: "differing times drop to a location-only header with time chips",
  data: { supported: true, events: [
    { title: "Recital Series", location: "Felicja Blumental Center", times: [
      { start: "2026-07-05T18:00:00" }, { start: "2026-07-14T19:00:00" }, { start: "2026-07-25T20:00:00" },
    ] },
  ] },
  listing: "none",
};
