// Per-leaf snapshot for requirement 5.6.3: the current year shows no pill.
// The filename (event-cards-appearance.5.6.3) is the link; build-requirements-gallery.js embeds this
// image inline beneath 5.6.3 in dev/requirements/requirements.md.
"use strict";

module.exports = {
  description: "the current year shows no pill",
  data: { supported: true, events: [{ title: "Neighborhood Mixer", start: "2026-06-19T19:00:00", location: "The Annex, Brooklyn" }] },
  listing: "none",
};
