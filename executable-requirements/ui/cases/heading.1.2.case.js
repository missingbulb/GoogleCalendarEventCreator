// Per-leaf snapshot for requirement 1.2: with events shown, the heading reads "Add to Google Calendar".
// The filename (heading.1.2) is the link; build-requirements-gallery.js embeds this
// image inline beneath 1.2 in executable-requirements/Requirements.md.
"use strict";

module.exports = {
  description: "with events shown, the heading reads \"Add to Google Calendar\"",
  data: { supported: true, events: [{ title: "Neighborhood Mixer", start: "2026-06-19T19:00:00", location: "The Annex, Brooklyn" }] },
  listing: "none",
};
