// Per-leaf snapshot for requirement 4.7: a grouped card has no single left calendar icon.
// The filename (event-cards-grouping.4.7) is the link; build-requirements-gallery.js embeds this
// image inline beneath 4.7 in executable-requirements/requirements.md.
"use strict";

module.exports = {
  description: "a grouped card has no single left calendar icon",
  data: { supported: true, events: [
    { title: "Film Week", location: "The Cinematheque", times: [
      { start: "2026-08-04T20:00:00" }, { start: "2026-08-12T20:00:00" },
    ] },
  ] },
  listing: "none",
};
