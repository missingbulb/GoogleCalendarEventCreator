// Per-leaf snapshot for requirement 5.8: a long title clamps to two lines and the location line ellipsizes.
// The filename (req-5.8) is the link; build-requirements-gallery.js embeds this
// image inline beneath 5.8 in executable-requirements/Requirements.md.
"use strict";

module.exports = {
  description: "a long title clamps to two lines and the location line ellipsizes",
  data: { supported: true, events: [
    { title: "Brooklyn New Year's Eve Rooftop Bash with a Very Long Title That Wraps to Two Lines and Then Ellipsizes",
      start: "2026-12-31T21:00:00", location: "The Williamsburg Hotel Rooftop Bar, Brooklyn, New York" },
  ] },
  listing: "none",
};
