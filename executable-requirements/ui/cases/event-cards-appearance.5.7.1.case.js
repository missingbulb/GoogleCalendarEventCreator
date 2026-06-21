// Per-leaf snapshot for requirement 5.7.1: a month card whose days share one time leads the header with it over day chips.
// The filename (event-cards-appearance.5.7.1) is the link; build-requirements-gallery.js embeds this
// image inline beneath 5.7.1 in executable-requirements/Requirements.md.
"use strict";

module.exports = {
  description: "a month card whose days share one time leads the header with it over day chips",
  data: { supported: true, events: [
    { title: "Conversation Club", location: "Beit Ariela", times: [
      { start: "2026-06-05T19:00:00" }, { start: "2026-06-14T19:00:00" }, { start: "2026-06-25T19:00:00" },
    ] },
  ] },
  listing: "none",
};
