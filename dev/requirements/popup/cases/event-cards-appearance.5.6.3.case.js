// Per-leaf snapshot for requirement 5.6.3: a current, not-yet-past date shows no
// pill. The filename (event-cards-appearance.5.6.3) is the link;
// build-requirements-gallery.js embeds this image inline beneath 5.6.3 in
// dev/requirements/requirements.md. Dated after the reference "now" (2026-06-01),
// so it's upcoming-this-year → no corner pill.
"use strict";

module.exports = {
  description: "a current, upcoming date (this year, not yet past) shows no pill",
  data: { supported: true, events: [{ title: "Neighborhood Mixer", start: "2026-06-19T19:00:00", location: "The Annex, Brooklyn" }] },
  listing: "none",
};
