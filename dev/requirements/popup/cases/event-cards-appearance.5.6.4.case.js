// Per-leaf snapshot for requirement 5.6.4: the "past" pill marks ANY past event,
// not only a prior year — an event earlier THIS year shows it too. The filename
// (event-cards-appearance.5.6.4) is the link; build-requirements-gallery.js embeds
// this image inline beneath 5.6.4 in dev/requirements/requirements.md.
//
// Dated 2026-02 — same year as the reference "now" (2026-06-01) but before it, so
// it's past → gray "past" pill, exactly like 5.6.1's prior-year card.
"use strict";

module.exports = {
  description: "a past event earlier THIS year (before today, same year) shows the gray \"past\" pill",
  data: {
    supported: true,
    events: [{ title: "Winter Members' Preview", start: "2026-02-14T18:00:00", location: "The Annex, Brooklyn" }],
  },
  listing: "none",
};
