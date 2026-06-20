// Per-leaf snapshot for requirement 5.3.2: a showing with start AND end shows the en-dash time range in the button.
// The filename (req-5.3.2) is the link; build-requirements-gallery.js embeds this
// image inline beneath 5.3.2 in docs/uiRequirements.md.
"use strict";

module.exports = {
  description: "a showing with start AND end shows the en-dash time range in the button",
  data: { supported: true, events: [
    { title: "Double Feature", location: "The Cinematheque", times: [
      { start: "2026-06-11T18:00:00", end: "2026-06-11T20:00:00" },
      { start: "2026-06-11T21:00:00", end: "2026-06-11T23:00:00" },
    ] },
  ] },
  listing: "none",
};
