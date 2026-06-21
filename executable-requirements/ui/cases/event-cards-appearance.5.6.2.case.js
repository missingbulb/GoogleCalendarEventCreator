// Per-leaf snapshot for requirement 5.6.2: a future year shows a green (upcoming) pill.
// The filename (event-cards-appearance.5.6.2) is the link; build-requirements-gallery.js embeds this
// image inline beneath 5.6.2 in executable-requirements/Requirements.md.
"use strict";

module.exports = {
  description: "a future year shows a green (upcoming) pill",
  data: { supported: true, events: [
    { title: "Next Year's Summit", start: "2027-03-12T09:00:00", location: "Pioneer Works" },
  ] },
  listing: "none",
};
