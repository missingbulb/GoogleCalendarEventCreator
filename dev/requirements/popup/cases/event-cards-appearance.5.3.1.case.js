// Per-leaf snapshot for requirement 5.3.1: a single-time showing's button shows just the time.
// The filename (event-cards-appearance.5.3.1) is the link; build-requirements-gallery.js embeds this
// image inline beneath 5.3.1 in requirements.md.
"use strict";

module.exports = {
  description: "a single-time showing's button shows just the time",
  data: { supported: true, events: [
    { title: "Recital Series", location: "Felicja Blumental Center", times: [
      { start: "2026-07-05T18:00:00" }, { start: "2026-07-14T19:00:00" },
    ] },
  ] },
  listing: "none",
};
