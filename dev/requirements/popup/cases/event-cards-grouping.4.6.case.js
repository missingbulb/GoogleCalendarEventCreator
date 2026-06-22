// Per-leaf snapshot for requirement 4.6: a month with 2+ showings is an unclickable card: a header over per-showing buttons.
// The filename (event-cards-grouping.4.6) is the link; build-requirements-gallery.js embeds this
// image inline beneath 4.6 in dev/requirements/requirements.md.
"use strict";

module.exports = {
  description: "a month with 2+ showings is an unclickable card: a header over per-showing buttons",
  data: { supported: true, events: [
    { title: "Film Week", location: "The Cinematheque", times: [
      { start: "2026-08-04T20:00:00" }, { start: "2026-08-12T20:00:00" },
    ] },
  ] },
  listing: "none",
};
