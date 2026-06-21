// Per-leaf snapshot for requirement 5.5: a grouped card is flat, not itself clickable, with no chevron.
// The filename (event-cards-appearance.5.5) is the link; build-requirements-gallery.js embeds this
// image inline beneath 5.5 in executable-requirements/requirements.md.
"use strict";

module.exports = {
  description: "a grouped card is flat, not itself clickable, with no chevron",
  data: { supported: true, events: [
    { title: "Film Week", location: "The Cinematheque", times: [
      { start: "2026-08-04T20:00:00" }, { start: "2026-08-12T20:00:00" },
    ] },
  ] },
  listing: "none",
};
