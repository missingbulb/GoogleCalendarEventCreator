// Per-leaf snapshot for requirement 4.2: an event's instances group by month into one card.
// The filename (req-4.2) is the link; build-requirements-gallery.js embeds this
// image inline beneath 4.2 in docs/uiRequirements.md.
"use strict";

module.exports = {
  description: "an event's instances group by month into one card",
  data: { supported: true, events: [
    { title: "Recital Series", location: "Felicja Blumental Center", times: [
      { start: "2026-07-05T19:00:00" }, { start: "2026-07-19T19:00:00" },
    ] },
  ] },
  listing: "none",
};
